package com.dropbridge.config;

import org.springframework.boot.autoconfigure.condition.ConditionMessage;
import org.springframework.boot.autoconfigure.condition.ConditionOutcome;
import org.springframework.boot.autoconfigure.condition.SpringBootCondition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.util.StringUtils;

import java.util.Properties;

/**
 * Registers JavaMailSender only when real SMTP settings are provided.
 * Avoids startup failures when MAIL_HOST is unset or a placeholder like "none".
 */
@Configuration
public class MailConfig {

    @Bean
    @Conditional(MailConfiguredCondition.class)
    public JavaMailSender javaMailSender(
            org.springframework.core.env.Environment env) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(env.getRequiredProperty("spring.mail.host"));
        sender.setPort(env.getProperty("spring.mail.port", Integer.class, 465));
        sender.setUsername(env.getProperty("spring.mail.username", ""));
        sender.setPassword(env.getProperty("spring.mail.password", ""));

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.ssl.enable", "true");
        props.put("mail.smtp.starttls.enable", "false");
        return sender;
    }

    static class MailConfiguredCondition extends SpringBootCondition {

        @Override
        public ConditionOutcome getMatchOutcome(ConditionContext context, AnnotatedTypeMetadata metadata) {
            String host = context.getEnvironment().getProperty("spring.mail.host", "");
            if (!StringUtils.hasText(host)) {
                return ConditionOutcome.noMatch(ConditionMessage.forCondition("MailConfigured")
                        .because("spring.mail.host is empty"));
            }
            String lower = host.trim().toLowerCase();
            if (lower.equals("none") || lower.equals("disabled") || lower.equals("false")) {
                return ConditionOutcome.noMatch(ConditionMessage.forCondition("MailConfigured")
                        .because("spring.mail.host is a placeholder"));
            }
            return ConditionOutcome.match(ConditionMessage.forCondition("MailConfigured")
                    .because("spring.mail.host is configured"));
        }
    }
}
