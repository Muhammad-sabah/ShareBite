-- ==============================================================================
-- Baqaya Web Marketplace - MySQL Database Schema
-- Target Market: Sulaymaniyah, Kurdistan Region of Iraq (IQD Currency)
-- Compatible with MySQL 8.0+ and MariaDB 10.4+
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS sharebite
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sharebite;
-- ------------------------------------------------------------------------------
-- 1. Users Table (Customers and Shop Owners)
--    Username uniqueness is scoped per role (FR-AUTH-05), allowing the same
--    username to exist independently as a customer and as a shop owner.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role          ENUM('customer', 'shop_owner', 'admin', 'beneficiary') NOT NULL,
  username      VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  phone_number  VARCHAR(20) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_role_username (role, username),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Shops Table (One Shop per Shop Owner)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shops (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id        BIGINT UNSIGNED NOT NULL,
  shop_name       VARCHAR(120) NOT NULL,
  category        ENUM('Bakery', 'Restaurant', 'Café', 'Grocery', 'Other') NOT NULL,
  contact_number  VARCHAR(20) NOT NULL,
  address         VARCHAR(255) NOT NULL,
  description     TEXT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_shops_owner_id (owner_id),
  UNIQUE KEY uq_shops_shop_name (shop_name),
  INDEX idx_shops_category (category),
  CONSTRAINT fk_shops_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Food Offers Table
--    Historical records are never permanently deleted (FR-DATA-03).
--    Prices are stored as whole IQD integers.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offers (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  offer_code         VARCHAR(20) NOT NULL,
  shop_id            BIGINT UNSIGNED NOT NULL,
  food_name          VARCHAR(150) NOT NULL,
  description        TEXT NULL,
  category           ENUM('Bakery', 'Restaurant', 'Café', 'Grocery', 'Other') NOT NULL,
  image_url          VARCHAR(500) NULL,
  original_price     INT UNSIGNED NOT NULL,
  discounted_price   INT UNSIGNED NOT NULL,
  original_quantity  INT UNSIGNED NOT NULL,
  available_quantity INT UNSIGNED NOT NULL,
  pickup_date        DATE NOT NULL,
  pickup_start_time  VARCHAR(5) NOT NULL,
  pickup_end_time    VARCHAR(5) NOT NULL,
  pickup_start_at    DATETIME NOT NULL,
  pickup_end_at      DATETIME NOT NULL,
  status             ENUM('Active', 'Sold Out', 'Expired', 'Deactivated') NOT NULL DEFAULT 'Active',
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_offers_code (offer_code),
  INDEX idx_offers_shop_id (shop_id),
  INDEX idx_offers_status_end (status, pickup_end_at),
  INDEX idx_offers_category (category),
  CONSTRAINT fk_offers_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_offers_prices
    CHECK (original_price > 0 AND discounted_price > 0 AND discounted_price < original_price),
  CONSTRAINT chk_offers_quantities
    CHECK (original_quantity > 0 AND available_quantity <= original_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Reservations Table
--    Historical records are never permanently deleted (FR-DATA-03).
--    Unit price and total price are computed & locked on the backend at creation.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_code  VARCHAR(20) NOT NULL,
  customer_id       BIGINT UNSIGNED NOT NULL,
  offer_id          BIGINT UNSIGNED NOT NULL,
  quantity          INT UNSIGNED NOT NULL,
  unit_price        INT UNSIGNED NOT NULL,
  total_price       INT UNSIGNED NOT NULL,
  status            ENUM('Active', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Active',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reservations_code (reservation_code),
  INDEX idx_reservations_customer (customer_id, status),
  INDEX idx_reservations_offer (offer_id, status),
  CONSTRAINT fk_reservations_customer
    FOREIGN KEY (customer_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_offer
    FOREIGN KEY (offer_id) REFERENCES offers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_reservations_qty
    CHECK (quantity > 0 AND unit_price > 0 AND total_price = quantity * unit_price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Beneficiary Profiles Table (Food Donation Feature)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficiary_profiles (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED NOT NULL,
  beneficiary_type    ENUM('Individual', 'Family', 'Charity', 'Shelter', 'Other') NOT NULL DEFAULT 'Individual',
  organization_name   VARCHAR(150) NULL,
  family_members      INT UNSIGNED NOT NULL DEFAULT 1,
  address             VARCHAR(255) NOT NULL,
  id_document_number  VARCHAR(100) NULL,
  verification_status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  rejection_reason    TEXT NULL,
  verified_by         BIGINT UNSIGNED NULL,
  verified_at         DATETIME NULL,
  source              ENUM('Direct Application', 'Admin Referral') NOT NULL DEFAULT 'Direct Application',
  notes               TEXT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_beneficiary_user_id (user_id),
  INDEX idx_beneficiary_status (verification_status),
  CONSTRAINT fk_beneficiary_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Food Donations Table (Free Surplus Food from Donors)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_donations (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  donation_code      VARCHAR(20) NOT NULL,
  shop_id            BIGINT UNSIGNED NOT NULL,
  food_name          VARCHAR(150) NOT NULL,
  description        TEXT NULL,
  category           ENUM('Bakery', 'Restaurant', 'Café', 'Grocery', 'Prepared Meals', 'Other') NOT NULL,
  image_url          VARCHAR(500) NULL,
  quantity           INT UNSIGNED NOT NULL,
  available_quantity INT UNSIGNED NOT NULL,
  pickup_date        DATE NOT NULL,
  pickup_start_time  VARCHAR(5) NOT NULL,
  pickup_end_time    VARCHAR(5) NOT NULL,
  pickup_start_at    DATETIME NOT NULL,
  pickup_end_at      DATETIME NOT NULL,
  delivery_available BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_notes     VARCHAR(255) NULL,
  status             ENUM('Active', 'Fully Claimed', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Active',
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_donations_code (donation_code),
  INDEX idx_donations_shop_id (shop_id),
  INDEX idx_donations_status_end (status, pickup_end_at),
  INDEX idx_donations_category (category),
  CONSTRAINT fk_donations_shop
    FOREIGN KEY (shop_id) REFERENCES shops(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_donations_qty
    CHECK (quantity > 0 AND available_quantity <= quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Donation Claims Table (Claimed by Approved Beneficiaries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donation_claims (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  claim_code         VARCHAR(20) NOT NULL,
  donation_id        BIGINT UNSIGNED NOT NULL,
  beneficiary_id     BIGINT UNSIGNED NOT NULL,
  quantity           INT UNSIGNED NOT NULL,
  delivery_requested BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_address   VARCHAR(255) NULL,
  delivery_notes     TEXT NULL,
  status             ENUM('Active', 'Fulfilled', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Active',
  fulfilled_at       DATETIME NULL,
  fulfillment_notes  TEXT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_claims_code (claim_code),
  INDEX idx_claims_donation_id (donation_id),
  INDEX idx_claims_beneficiary_id (beneficiary_id),
  INDEX idx_claims_status (status),
  CONSTRAINT fk_claims_donation
    FOREIGN KEY (donation_id) REFERENCES food_donations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_claims_beneficiary
    FOREIGN KEY (beneficiary_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_claims_qty
    CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


