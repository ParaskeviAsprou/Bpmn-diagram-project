package bpmnProject.akon.bpmnJavaBackend.User;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "roles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "users")
@ToString(exclude = "users")
public class Role {

    // Role constants
    public static final String ROLE_ADMIN = "ROLE_ADMIN";
    public static final String ROLE_MODELER = "ROLE_MODELER";
    public static final String ROLE_VIEWER = "ROLE_VIEWER";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String name;

    @Column(name = "display_name")
    private String displayName;

    @Column(length = 500)
    private String description;

    @JsonIgnore
    @ManyToMany(mappedBy = "roles", fetch = FetchType.LAZY)
    private Set<User> users;

    // Constructor for easier role creation
    public Role(String name, String displayName) {
        this.name = name;
        this.displayName = displayName;
    }

    public Role(String name, String displayName, String description) {
        this.name = name;
        this.displayName = displayName;
        this.description = description;
    }
}