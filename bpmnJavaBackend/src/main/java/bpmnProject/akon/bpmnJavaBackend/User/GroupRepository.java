package bpmnProject.akon.bpmnJavaBackend.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {

    Optional<Group> findByName(String name);

    boolean existsByName(String name);

    // Fixed: Added missing 'd' in 'find'
    List<Group> findByIsActiveTrue();

    @Query("SELECT g FROM Group g JOIN g.users u WHERE u.id = :userId AND g.isActive = true")
    List<Group> findByUserId(@Param("userId") Integer userId);

    @Query("SELECT g FROM Group g WHERE g.isActive = true AND g.createdBy = :createdBy")
    List<Group> findByIsActiveTrueAndCreatedBy(@Param("createdBy") String createdBy);

    @Query("SELECT g FROM Group g WHERE g.isActive = true AND " +
            "(LOWER(g.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(g.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    List<Group> searchGroups(@Param("searchTerm") String searchTerm);

    @Query("SELECT g, COUNT(u) FROM Group g LEFT JOIN g.users u WHERE g.isActive = true GROUP BY g")
    List<Object[]> findGroupsWithUserCount();
}