<?php
require_once __DIR__.'/../../config/db_config.php';

$conn = new mysqli(
    $db_config['localhost'],
    $db_config['sreya'],
    $db_config['sreya'],
    $db_config['sports_inventory']
);

$name = $_POST['name'];
$category = $_POST['category'];
$quantity = $_POST['quantity'];

$stmt = $conn->prepare("INSERT INTO equipment (name, category_id, quantity) VALUES (?, ?, ?)");
$stmt->bind_param("sii", $name, $category, $quantity);
$stmt->execute();

echo json_encode(['success' => true]);
?>