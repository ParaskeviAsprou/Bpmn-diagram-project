package bpmnProject.akon.bpmnJavaBackend.User;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name="user_group")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "users")
@ToString(exclude = "users")
public class Group {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_time")
    private LocalDateTime uploadTime;

    @Column(name ="is_active")
    @Builder.Default
    private Boolean isActive = true;

    @JsonIgnore
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "group_users",
        joinColumns = @JoinColumn(name = "group_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private Set<User> users = new HashSet<>();

    @PrePersist
    public void prePersist() {
        if (this.uploadTime == null) {
            this.uploadTime = LocalDateTime.now();
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }

    @PreUpdate
    public void preUpdate() {
        if (this.uploadTime == null) {
            this.uploadTime = LocalDateTime.now();
        }
    }
    public void addUser(User user) {
            this.users.add(user);

    }
    public void removeUser(User user) {
        users.remove(user);
    }

    public boolean hasUser(User user) {
        return users.contains(user);
    }
}
