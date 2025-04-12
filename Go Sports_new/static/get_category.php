<?php
header('Content-Type: application/json');
require_once __DIR__.'/../../config/db_config.php';

$conn = new mysqli(
    $db_config['localhost'],
    $db_config['sreya'],
    $db_config['sreya'],
    $db_config['sports_inventory']
);

$result = $conn->query("SELECT * FROM categories");
$categories = $result->fetch_all(MYSQLI_ASSOC);

echo json_encode([
    'success' => true,
    'categories' => $categories
]);

$conn->close();
?>