package bpmnProject.akon.bpmnJavaBackend.File;

import bpmnProject.akon.bpmnJavaBackend.User.Group;
import bpmnProject.akon.bpmnJavaBackend.User.Role;
import bpmnProject.akon.bpmnJavaBackend.User.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiagramAssignmentRepository extends JpaRepository<DiagramAssignment, Long> {

    List<DiagramAssignment> findByDiagramIdAndIsActiveTrue(Long diagramId);

    List<DiagramAssignment> findByAssignedUserAndIsActiveTrue(User user);

    List<DiagramAssignment> findByAssignedGroupAndIsActiveTrue(Group group);

    List<DiagramAssignment> findByAssignedRoleAndIsActiveTrue(Role role);

    @Query("""
        SELECT DISTINCT da.diagram FROM DiagramAssignment da 
        WHERE da.isActive = true AND (
            (da.assignmentType = 'USER' AND da.assignedUser.id = :userId) OR
            (da.assignmentType = 'GROUP' AND da.assignedGroup.id IN :groupIds) OR
            (da.assignmentType = 'ROLE' AND da.assignedRole.id IN :roleIds)
        )
        """)
    List<File> findAccessibleDiagrams(@Param("userId") Integer userId,
                                      @Param("groupIds") List<Long> groupIds,
                                      @Param("roleIds") List<Integer> roleIds);


    @Query("""
        SELECT COUNT(da) > 0 FROM DiagramAssignment da 
        WHERE da.diagram.id = :diagramId AND da.isActive = true AND (
            (da.assignmentType = 'USER' AND da.assignedUser.id = :userId) OR
            (da.assignmentType = 'GROUP' AND da.assignedGroup.id IN :groupIds) OR
            (da.assignmentType = 'ROLE' AND da.assignedRole.id IN :roleIds)
        )
        """)
    boolean hasUserAccessToDiagram(@Param("diagramId") Long diagramId,
                                   @Param("userId") Integer userId,
                                   @Param("groupIds") List<Long> groupIds,
                                   @Param("roleIds") List<Integer> roleIds);


    @Query("""
        SELECT MAX(da.permissionLevel) FROM DiagramAssignment da 
        WHERE da.diagram.id = :diagramId AND da.isActive = true AND (
            (da.assignmentType = 'USER' AND da.assignedUser.id = :userId) OR
            (da.assignmentType = 'GROUP' AND da.assignedGroup.id IN :groupIds) OR
            (da.assignmentType = 'ROLE' AND da.assignedRole.id IN :roleIds)
        )
        """)
    Optional<DiagramAssignment.PermissionLevel> getUserPermissionLevel(@Param("diagramId") Long diagramId,
                                                                       @Param("userId") Integer userId,
                                                                       @Param("groupIds") List<Long> groupIds,
                                                                       @Param("roleIds") List<Integer> roleIds);

    @Query("""
        SELECT da FROM DiagramAssignment da 
        WHERE da.diagram.id = :diagramId AND da.isActive = true AND (
            (da.assignmentType = 'USER' AND da.assignedUser.id = :userId) OR
            (da.assignmentType = 'GROUP' AND da.assignedGroup.id = :groupId) OR
            (da.assignmentType = 'ROLE' AND da.assignedRole.id = :roleId)
        )
        """)
    Optional<DiagramAssignment> findExistingAssignment(@Param("diagramId") Long diagramId,
                                                       @Param("userId") Integer userId,
                                                       @Param("groupId") Long groupId,
                                                       @Param("roleId") Integer roleId);
    List<DiagramAssignment> findByAssignedByAndIsActiveTrueOrderByAssignedTimeDesc(String assignedBy);

    @Query("SELECT da.assignmentType, COUNT(da) FROM DiagramAssignment da WHERE da.isActive = true GROUP BY da.assignmentType")
    List<Object[]> countAssignmentsByType();
}