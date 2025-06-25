package bpmnProject.akon.bpmnJavaBackend.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(String name);

    List<Role> findByNameIn(List<String> names);

    @Query("SELECT r FROM Role r WHERE r.displayName = :displayName")
    Optional<Role> findByDisplayName(@Param("displayName") String displayName);

    @Query("SELECT r FROM Role r ORDER BY r.name")
    List<Role> findAllOrderByName();

    boolean existsByName(String name);
}