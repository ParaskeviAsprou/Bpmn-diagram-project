package bpmnProject.akon.bpmnJavaBackend.Settings;

import bpmnProject.akon.bpmnJavaBackend.User.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_security_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "user")
@ToString(exclude = "user")
public class UserSecuritySettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "two_factor_auth")
    @Builder.Default
    private Boolean twoFactorAuth = false;

    @Column(name = "session_timeout")
    @Builder.Default
    private Integer sessionTimeout = 30;

    @Column(name = "login_notifications")
    @Builder.Default
    private Boolean loginNotifications = false;
}
