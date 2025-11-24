<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/phpmailer/src/PHPMailer.php';
require __DIR__ . '/phpmailer/src/SMTP.php';
require __DIR__ . '/phpmailer/src/Exception.php';

// Database
$host = "localhost";
$user = "tasslszw_tassu_user"; 
$pass = "Priyanath@1990"; 
$db   = "tasslszw_tassu_db"; 

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

// Send email
$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'server704.web-hosting.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'no-reply@tassukaveri.fi';
    $mail->Password = 'Priyanath@1990';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = 465;

    $mail->setFrom('no-reply@tassukaveri.fi', 'TassuKaveri');
    $mail->addAddress($email);

    $mail->Subject = "Tervetuloa TassuKaveriin!";
    $mail->isHTML(true);

    $template = __DIR__ . '/email_template.html';
    if (file_exists($template)) {
        $mail->Body = file_get_contents($template);
    } else {
        $mail->Body = "<h2>Tervetuloa TassuKaveriin!</h2><p>Kiitos liittymisest채!</p>";
    }

    $mail->send();
    echo "success";

} catch (Exception $e) {
    echo "Mailer Error: " . $mail->ErrorInfo;
}
?>
