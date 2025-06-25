package bpmnProject.akon.bpmnJavaBackend.User;

import bpmnProject.akon.bpmnJavaBackend.Token.Token;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.*;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "_user")
@EqualsAndHashCode(exclude = {"tokens", "roles"})
@ToString(exclude = {"tokens", "roles"})
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String firstname;
    private String lastname;
    private String username;
    private String email;
    private String phone;
    private String profilePicture;

    @JsonIgnore
    private String password;

    @Column(name = "enabled")
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "account_non_expired")
    @Builder.Default
    private boolean accountNonExpired = true;

    @Column(name = "account_non_locked")
    @Builder.Default
    private boolean accountNonLocked = true;

    @Column(name = "credentials_non_expired")
    @Builder.Default
    private boolean credentialsNonExpired = true;

    // Many-to-Many relationship with Role - NO CASCADE to avoid detached entity issues
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Token> tokens = new ArrayList<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority(role.getName()))
                .collect(Collectors.toList());
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username != null ? username : email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return accountNonExpired;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return credentialsNonExpired;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    // Helper methods for role management
    public void addRole(Role role) {
        this.roles.add(role);
    }

    public void removeRole(Role role) {
        this.roles.remove(role);
    }

    public boolean hasRole(String roleName) {
        return roles.stream()
                .anyMatch(role -> role.getName().equals(roleName));
    }

    public List<String> getRoleNames() {
        return roles.stream()
                .map(Role::getName)
                .toList();
    }

    public String getFullName() {
        if (firstname != null && lastname != null) {
            return firstname + " " + lastname;
        } else if (firstname != null) {
            return firstname;
        } else if (lastname != null) {
            return lastname;
        }
        return username != null ? username : email;
    }

    // Debug method
    public void printAccountStatus() {
        System.out.println("User: " + this.getUsername());
        System.out.println("Enabled: " + this.isEnabled());
        System.out.println("AccountNonExpired: " + this.isAccountNonExpired());
        System.out.println("AccountNonLocked: " + this.isAccountNonLocked());
        System.out.println("CredentialsNonExpired: " + this.isCredentialsNonExpired());
        System.out.println("Roles: " + this.getRoleNames());
    }
}