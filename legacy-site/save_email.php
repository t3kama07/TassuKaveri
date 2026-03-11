<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/phpmailer/src/PHPMailer.php';
require __DIR__ . '/phpmailer/src/SMTP.php';
require __DIR__ . '/phpmailer/src/Exception.php';

// Load environment variables from .env file
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Get credentials from environment variables
$host = $_ENV['DB_HOST'] ?? 'localhost';
$user = $_ENV['DB_USER'] ?? '';
$pass = $_ENV['DB_PASS'] ?? '';
$db   = $_ENV['DB_NAME'] ?? '';

$smtpHost     = $_ENV['SMTP_HOST'] ?? '';
$smtpUser     = $_ENV['SMTP_USER'] ?? '';
$smtpPass     = $_ENV['SMTP_PASS'] ?? '';
$smtpPort     = $_ENV['SMTP_PORT'] ?? 465;
$fromEmail    = $_ENV['FROM_EMAIL'] ?? 'no-reply@tassukaveri.fi';
$adminEmail   = $_ENV['ADMIN_EMAIL'] ?? 'info@tassukaveri.fi';

$email = trim($_POST['email'] ?? '');

if (!$email) {
    echo "invalid email";
    exit;
}

// Connect safely
$conn = @new mysqli($host, $user, $pass, $db);

if (!$conn->connect_errno) {

    // Insert only if not duplicate
    $stmt = $conn->prepare("INSERT IGNORE INTO subscribers (email) VALUES (?)");

    if ($stmt) {
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->close();
    }
}


// 1️ SEND WELCOME EMAIL TO USER

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = $smtpHost;
    $mail->SMTPAuth = true;
    $mail->Username = $smtpUser;
    $mail->Password = $smtpPass;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = $smtpPort;

    $mail->setFrom($fromEmail, 'TassuKaveri');
    $mail->addAddress($email);

    $mail->Subject = "Tervetuloa TassuKaveriin!";
    $mail->isHTML(true);

    $template = __DIR__ . '/email_template.html';
    if (file_exists($template)) {
        $mail->Body = file_get_contents($template);
    } else {
        $mail->Body = "<h2>Tervetuloa TassuKaveriin!</h2><p>Kiitos liittymisestä!</p>";
    }

    $mail->send();

} catch (Exception $e) {
    // do not stop script
}


// 2 SEND ADMIN NOTIFICATION TO info@tassukaveri.fi


try {
    $adminMail = new PHPMailer(true);
    $adminMail->isSMTP();
    $adminMail->Host = $smtpHost;
    $adminMail->SMTPAuth = true;
    $adminMail->Username = $smtpUser;
    $adminMail->Password = $smtpPass;
    $adminMail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $adminMail->Port = $smtpPort;

    $adminMail->setFrom($fromEmail, 'TassuKaveri');
    $adminMail->addAddress($adminEmail); // Admin email

    $adminMail->Subject = "New Subscriber Joined";
    $adminMail->isHTML(true);
    $adminMail->Body = "
        <h2>New subscriber joined TassuKaveri</h2>
        <p><strong>Email:</strong> " . htmlspecialchars($email) . "</p>
        <p>Timestamp: " . date("Y-m-d H:i:s") . "</p>
    ";

    $adminMail->send();

} catch (Exception $e) {
    // don't show error to user
}

echo "success";
?>
