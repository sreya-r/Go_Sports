<?php
header('Content-Type: application/json');
require_once __DIR__.'/../../config/db_config.php';

$conn = new mysqli(
    $db_config['localhost'],
    $db_config['sreya'],
    $db_config['sreya'],
    $db_config['sports_inventory']
);

$equipment_id = $_POST['equipment_id'] ?? 0;
$user_id = $_POST['user_id'] ?? 1; // Default to admin if not specified
$quantity = $_POST['quantity'] ?? 1;
$due_date = date('Y-m-d H:i:s', strtotime($_POST['due_date'] ?? '+7 days'));

// 1. Check available quantity
$check = $conn->query("SELECT quantity FROM equipment WHERE equipment_id = $equipment_id");
$available = $check->fetch_assoc()['quantity'];

if ($quantity > $available) {
    echo json_encode([
        'success' => false,
        'error' => "Only $available items available"
    ]);
    exit;
}

// 2. Create checkout record
$stmt = $conn->prepare("INSERT INTO checkouts (equipment_id, user_id, quantity, due_date) VALUES (?, ?, ?, ?)");
$stmt->bind_param("iiis", $equipment_id, $user_id, $quantity, $due_date);
$success = $stmt->execute();

echo json_encode([
    'success' => $success,
    'error' => $success ? null : $conn->error
]);

$stmt->close();
$conn->close();
?>