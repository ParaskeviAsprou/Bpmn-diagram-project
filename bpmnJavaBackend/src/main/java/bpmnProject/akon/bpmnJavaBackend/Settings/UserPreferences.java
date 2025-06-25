package bpmnProject.akon.bpmnJavaBackend.Settings;

import bpmnProject.akon.bpmnJavaBackend.User.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_preferences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "user")
@ToString(exclude = "user")
public class UserPreferences {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "theme")
    @Builder.Default
    private String theme = "light";

    @Column(name = "language")
    @Builder.Default
    private String language = "en";

    @Column(name = "timezone")
    @Builder.Default
    private String timezone = "UTC";

    @Column(name = "date_format")
    @Builder.Default
    private String dateFormat = "MM/DD/YYYY";

    @Column(name = "email_notifications")
    @Builder.Default
    private Boolean emailNotifications = true;

    @Column(name = "in_app_notifications")
    @Builder.Default
    private Boolean inAppNotifications = true;

    @Column(name = "push_notifications")
    @Builder.Default
    private Boolean pushNotifications = true;

    @Column(name = "address")
    private String address;

    @Column(name = "phone")
    private String phone;

    @Column(name = "profile_picture")
    private String profilePicture;

}
