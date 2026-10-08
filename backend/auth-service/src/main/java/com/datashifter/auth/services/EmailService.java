package com.datashifter.auth.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendPasswordResetEmail(String to, String resetToken) {
        if (fromEmail == null || fromEmail.isBlank()) {
            log.error("Email delivery failed for user {}: No email service or SMTP token configured in the system. Reset token generated but not sent: {}", to, resetToken);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("Password Reset Request - DataShifter");
            
            String resetLink = "http://localhost:3000/reset-password?token=" + resetToken;
            
            message.setText("Hello,\n\nYou have requested to reset your password. Click the link below to reset it:\n\n"
                    + resetLink + "\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.");
            
            mailSender.send(message);
            log.info("Password reset email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", to, e.getMessage(), e);
        }
    }
}
