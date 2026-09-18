<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$action = $_GET['action'] ?? '';
$db = getDB();

try {
    switch ($action) {
        case 'register':
            $data = json_decode(file_get_contents('php://input'), true);
            $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
            $password = $data['password'];
            $parentPin = $data['parentPin'] ?? '1234';
            
            if (empty($email) || empty($password)) {
                throw new Exception("Email y contraseña son obligatorios.");
            }

            $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                throw new Exception("El correo ya está registrado.");
            }

            $userId = bin2hex(random_bytes(16)); 
            $hash = password_hash($password, PASSWORD_BCRYPT);
            
            $stmt = $db->prepare("INSERT INTO users (id, email, password_hash, parent_pin) VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $email, $hash, $parentPin]);

            echo json_encode(['status' => 'success', 'userId' => $userId, 'email' => $email, 'pin' => $parentPin]);
            break;

        case 'login':
            $data = json_decode(file_get_contents('php://input'), true);
            $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
            
            $stmt = $db->prepare("SELECT id, email, password, password_hash, parent_pin FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            $hash = $user['password_hash'] ?? $user['password'] ?? '';

            if ($user && password_verify($data['password'], $hash)) {
                echo json_encode([
                    'status' => 'success', 
                    'userId' => $user['id'], 
                    'email' => $user['email'],
                    'pin' => $user['parent_pin']
                ]);
            } else {
                throw new Exception("Credenciales incorrectas.");
            }
            break;

        case 'reset_password':
            $data = json_decode(file_get_contents('php://input'), true);
            $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
            $pin = $data['pin'];
            $newPassword = $data['newPassword'];

            $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND parent_pin = ?");
            $stmt->execute([$email, $pin]);
            $user = $stmt->fetch();

            if (!$user) {
                throw new Exception("El email o el PIN parental no coinciden.");
            }

            $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $stmt->execute([$newHash, $user['id']]);

            echo json_encode(['status' => 'success']);
            break;

        case 'update_pin':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("UPDATE users SET parent_pin = ? WHERE id = ?");
            $stmt->execute([$data['newPin'], $data['userId']]);
            echo json_encode(['status' => 'success']);
            break;

        default:
            throw new Exception("Acción no definida");
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
