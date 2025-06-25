// UserRepository.java - ΔΙΟΡΘΩΜΕΝΗ ΕΚΔΟΣΗ
package bpmnProject.akon.bpmnJavaBackend.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    @Query("SELECT u FROM User u WHERE u.email = :email OR u.username = :username")
    Optional<User> findByEmailOrUsername(@Param("email") String email, @Param("username") String username);

    // ΔΙΟΡΘΩΣΗ: Προσθήκη EAGER fetch για roles
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.username = :username")
    Optional<User> findByUsernameWithRoles(@Param("username") String username);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.email = :email")
    Optional<User> findByEmailWithRoles(@Param("email") String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.email = :emailOrUsername OR u.username = :emailOrUsername")
    Optional<User> findByEmailOrUsernameWithRoles(@Param("emailOrUsername") String emailOrUsername);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName")
    List<User> findByRoleName(@Param("roleName") String roleName);

    @Query("SELECT u FROM User u WHERE u.enabled = :enabled")
    List<User> findByEnabled(@Param("enabled") boolean enabled);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    // Debug query - για να δούμε τι υπάρχει στη βάση
    @Query("SELECT u.username, u.email, u.enabled FROM User u")
    List<Object[]> findAllUsernamesAndEmails();
}