CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    firebase_uid VARCHAR(255) UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('vendor', 'supplier', 'admin') DEFAULT 'vendor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,

    user_id INT NOT NULL,

    business_name VARCHAR(255) NOT NULL,

    gst_number VARCHAR(100) UNIQUE,

    pan_number VARCHAR(100),

    aadhaar_number VARCHAR(100),

    verification_status ENUM(
        'pending',
        'under_review',
        'verified',
        'rejected',
        'suspended'
    ) DEFAULT 'pending',

    bank_details TEXT,

    address TEXT,

    phone VARCHAR(20),

    profile_image VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,

    name VARCHAR(100) UNIQUE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,

    supplier_id INT NOT NULL,

    category_id INT,

    name VARCHAR(255) NOT NULL,

    description TEXT,

    price DECIMAL(10,2) NOT NULL,

    stock INT DEFAULT 0,

    image_url VARCHAR(500),

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON DELETE CASCADE,

    FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL
);

CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,

    customer_id INT NOT NULL,

    supplier_id INT NOT NULL,

    total_amount DECIMAL(10,2) NOT NULL,

    order_status ENUM(
        'placed',
        'accepted',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'refunded'
    ) DEFAULT 'placed',

    tracking_id VARCHAR(100),

    delivery_partner VARCHAR(100),

    payment_status ENUM(
        'pending',
        'paid',
        'failed',
        'refunded'
    ) DEFAULT 'pending',

    estimated_delivery DATETIME,

    shipped_at DATETIME,

    delivered_at DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON DELETE CASCADE
);

CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,

    order_id INT NOT NULL,

    product_id INT NOT NULL,

    quantity INT NOT NULL,

    price DECIMAL(10,2) NOT NULL,

    subtotal DECIMAL(10,2) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,

    order_id INT NOT NULL,

    razorpay_order_id VARCHAR(255),

    razorpay_payment_id VARCHAR(255),

    amount DECIMAL(10,2) NOT NULL,

    payment_status ENUM(
        'pending',
        'paid',
        'failed',
        'refunded'
    ) DEFAULT 'pending',

    payment_method VARCHAR(100),

    paid_at DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
);

CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,

    order_id INT NOT NULL,

    customer_id INT NOT NULL,

    supplier_id INT NOT NULL,

    rating INT CHECK (rating >= 1 AND rating <= 5),

    comment TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON DELETE CASCADE
);

CREATE TABLE complaints (
    id INT PRIMARY KEY AUTO_INCREMENT,

    order_id INT NOT NULL,

    customer_id INT NOT NULL,

    supplier_id INT NOT NULL,

    complaint_type VARCHAR(100),

    description TEXT NOT NULL,

    status ENUM(
        'open',
        'under_review',
        'resolved',
        'rejected'
    ) DEFAULT 'open',

    admin_remark TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON DELETE CASCADE
);

CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,

    user_id INT NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    type VARCHAR(100),

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE delivery_partners (
    id INT PRIMARY KEY AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    phone VARCHAR(20),

    vehicle_number VARCHAR(50),

    status ENUM(
        'available',
        'busy',
        'offline'
    ) DEFAULT 'available',

    current_latitude DECIMAL(10,7),

    current_longitude DECIMAL(10,7),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verification_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,

    supplier_id INT NOT NULL,

    document_type ENUM(
        'gst',
        'pan',
        'aadhaar',
        'shop_image',
        'bank_proof'
    ) NOT NULL,

    document_url VARCHAR(500) NOT NULL,

    verification_status ENUM(
        'pending',
        'approved',
        'rejected'
    ) DEFAULT 'pending',

    admin_remark TEXT,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON DELETE CASCADE
);