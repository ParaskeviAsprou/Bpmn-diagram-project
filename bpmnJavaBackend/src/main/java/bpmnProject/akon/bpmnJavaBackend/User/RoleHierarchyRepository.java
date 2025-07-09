package bpmnProject.akon.bpmnJavaBackend.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleHierarchyRepository extends JpaRepository<RoleHierarchy, Long> {

    @Query("SELECT rh FROM RoleHierarchy rh WHERE rh.parentRoleId = :parentRoleId AND rh.isActive = true")
    List<RoleHierarchy> findByParentRoleId(@Param("parentRoleId") Integer parentRoleId);

    @Query("SELECT rh FROM RoleHierarchy rh WHERE rh.childRoleId = :childRoleId AND rh.isActive = true")
    List<RoleHierarchy> findByChildRoleId(@Param("childRoleId") Integer childRoleId);

    @Query(value = """
            WITH RECURSIVE role_tree AS (
                SELECT child_role_id as role_id, hierarchy_level, 0 as depth
                FROM role_hierarchy 
                WHERE parent_role_id = :roleId AND is_active = true
            
                UNION ALL
            
                SELECT rh.child_role_id, rh.hierarchy_level, rt.depth + 1
                FROM role_hierarchy rh
                INNER JOIN role_tree rt ON rh.parent_role_id = rt.role_id
                WHERE rh.is_active = true AND rt.depth < 10
            )
            SELECT DISTINCT role_id FROM role_tree
            UNION
            SELECT :roleId
            """, nativeQuery = true)
    List<Integer> findAllAccessibleRoleIds(@Param("roleId") Integer roleId);

    @Query("SELECT rh FROM RoleHierarchy rh WHERE rh.parentRoleId = :parentRoleId AND rh.childRoleId = :childRoleId")
    Optional<RoleHierarchy> findByParentAndChild(@Param("parentRoleId") Integer parentRoleId,
                                                 @Param("childRoleId") Integer childRoleId);

    @Query("SELECT rh FROM RoleHierarchy rh WHERE rh.isActive = true ORDER BY rh.hierarchyLevel, rh.parentRole.name")
    List<RoleHierarchy> findAllActiveHierarchies();

    @Query(value = """
        SELECT r.* FROM roles r 
        WHERE r.id NOT IN (
            SELECT DISTINCT child_role_id FROM role_hierarchy WHERE is_active = true
        )
        ORDER BY r.name
        """, nativeQuery = true)
    List<Role> findTopLevelRoles();
}