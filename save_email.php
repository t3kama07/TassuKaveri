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


// 1️ SEND WELCOME EMAIL TO USER

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
    $adminMail->Host = 'server704.web-hosting.com';
    $adminMail->SMTPAuth = true;
    $adminMail->Username = 'no-reply@tassukaveri.fi';
    $adminMail->Password = 'Priyanath@1990';
    $adminMail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $adminMail->Port = 465;

    $adminMail->setFrom('no-reply@tassukaveri.fi', 'TassuKaveri');
    $adminMail->addAddress('info@tassukaveri.fi'); // Admin email

    $adminMail->Subject = "New Subscriber Joined";
    $adminMail->isHTML(true);
    $adminMail->Body = "
        <h2>New subscriber joined TassuKaveri</h2>
        <p><strong>Email:</strong> $email</p>
        <p>Timestamp: " . date("Y-m-d H:i:s") . "</p>
    ";

    $adminMail->send();

} catch (Exception $e) {
    // don't show error to user
}

echo "success";
?>
