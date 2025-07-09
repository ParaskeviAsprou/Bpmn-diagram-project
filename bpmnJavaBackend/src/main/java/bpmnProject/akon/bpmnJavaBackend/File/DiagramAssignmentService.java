package bpmnProject.akon.bpmnJavaBackend.File;

import bpmnProject.akon.bpmnJavaBackend.User.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiagramAssignmentService {

    private final DiagramAssignmentRepository assignmentRepository;
    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final RoleRepository roleRepository;
    private final RoleHierarchyService roleHierarchyService;

    /**
     * Assign diagram to user
     */
    @Transactional
    public DiagramAssignment assignDiagramToUser(Long diagramId, Integer userId,
                                                 DiagramAssignment.PermissionLevel permissionLevel,
                                                 String assignedBy, String notes) {
        File diagram = fileRepository.findById(diagramId)
                .orElseThrow(() -> new RuntimeException("Diagram not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if assignment already exists
        Optional<DiagramAssignment> existing = assignmentRepository.findExistingAssignment(diagramId, userId, null, null);
        if (existing.isPresent()) {
            throw new RuntimeException("User already has access to this diagram");
        }

        DiagramAssignment assignment = DiagramAssignment.builder()
                .diagram(diagram)
                .assignedUser(user)
                .assignmentType(DiagramAssignment.AssignmentType.USER)
                .permissionLevel(permissionLevel)
                .assignedBy(assignedBy)
                .assignedTime(LocalDateTime.now())
                .notes(notes)
                .isActive(true)
                .build();

        return assignmentRepository.save(assignment);
    }

    /**
     * Assign diagram to group
     */
    @Transactional
    public DiagramAssignment assignDiagramToGroup(Long diagramId, Long groupId,
                                                  DiagramAssignment.PermissionLevel permissionLevel,
                                                  String assignedBy, String notes) {
        File diagram = fileRepository.findById(diagramId)
                .orElseThrow(() -> new RuntimeException("Diagram not found"));

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Check if assignment already exists
        Optional<DiagramAssignment> existing = assignmentRepository.findExistingAssignment(diagramId, null, groupId, null);
        if (existing.isPresent()) {
            throw new RuntimeException("Group already has access to this diagram");
        }

        DiagramAssignment assignment = DiagramAssignment.builder()
                .diagram(diagram)
                .assignedGroup(group)
                .assignmentType(DiagramAssignment.AssignmentType.GROUP)
                .permissionLevel(permissionLevel)
                .assignedBy(assignedBy)
                .assignedTime(LocalDateTime.now())
                .notes(notes)
                .isActive(true)
                .build();

        return assignmentRepository.save(assignment);
    }

    /**
     * Assign diagram to role
     */
    @Transactional
    public DiagramAssignment assignDiagramToRole(Long diagramId, Integer roleId,
                                                 DiagramAssignment.PermissionLevel permissionLevel,
                                                 String assignedBy, String notes) {
        File diagram = fileRepository.findById(diagramId)
                .orElseThrow(() -> new RuntimeException("Diagram not found"));

        Role role = roleRepository.findById(roleId.longValue())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        // Check if assignment already exists
        Optional<DiagramAssignment> existing = assignmentRepository.findExistingAssignment(diagramId, null, null, roleId);
        if (existing.isPresent()) {
            throw new RuntimeException("Role already has access to this diagram");
        }

        DiagramAssignment assignment = DiagramAssignment.builder()
                .diagram(diagram)
                .assignedRole(role)
                .assignmentType(DiagramAssignment.AssignmentType.ROLE)
                .permissionLevel(permissionLevel)
                .assignedBy(assignedBy)
                .assignedTime(LocalDateTime.now())
                .notes(notes)
                .isActive(true)
                .build();

        return assignmentRepository.save(assignment);
    }

    /**
     * Get all diagrams accessible to a user
     */
    @Transactional(readOnly = true)
    public List<File> getAccessibleDiagrams(User user) {
        // Get user's group IDs
        List<Long> groupIds = groupRepository.findByUserId(user.getId())
                .stream()
                .map(Group::getId)
                .collect(Collectors.toList());

        // Get user's accessible role IDs (including hierarchy)
        List<Integer> roleIds = roleHierarchyService.getAllAccessibleRoleIds(user)
                .stream()
                .toList();

        return assignmentRepository.findAccessibleDiagrams(user.getId(), groupIds, roleIds);
    }

    /**
     * Check if user has access to diagram
     */
    @Transactional(readOnly = true)
    public boolean hasUserAccessToDiagram(Long diagramId, User user) {
        // Get user's group IDs
        List<Long> groupIds = groupRepository.findByUserId(user.getId())
                .stream()
                .map(Group::getId)
                .collect(Collectors.toList());

        // Get user's accessible role IDs (including hierarchy)
        List<Integer> roleIds = roleHierarchyService.getAllAccessibleRoleIds(user)
                .stream()
                .toList();

        return assignmentRepository.hasUserAccessToDiagram(diagramId, user.getId(), groupIds, roleIds);
    }

    /**
     * Get user's permission level for diagram
     */
    @Transactional(readOnly = true)
    public DiagramAssignment.PermissionLevel getUserPermissionLevel(Long diagramId, User user) {
        // Get user's group IDs
        List<Long> groupIds = groupRepository.findByUserId(user.getId())
                .stream()
                .map(Group::getId)
                .collect(Collectors.toList());

        // Get user's accessible role IDs (including hierarchy)
        List<Integer> roleIds = roleHierarchyService.getAllAccessibleRoleIds(user)
                .stream()
                .toList();

        return assignmentRepository.getUserPermissionLevel(diagramId, user.getId(), groupIds, roleIds)
                .orElse(DiagramAssignment.PermissionLevel.VIEW);
    }

    /**
     * Get assignments for diagram
     */
    @Transactional(readOnly = true)
    public List<DiagramAssignment> getDiagramAssignments(Long diagramId) {
        return assignmentRepository.findByDiagramIdAndIsActiveTrue(diagramId);
    }

    /**
     * Remove assignment
     */
    @Transactional
    public void removeAssignment(Long assignmentId) {
        DiagramAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        assignment.setIsActive(false);
        assignmentRepository.save(assignment);
    }

    /**
     * Update assignment permission level
     */
    @Transactional
    public DiagramAssignment updateAssignmentPermission(Long assignmentId,
                                                        DiagramAssignment.PermissionLevel newPermissionLevel) {
        DiagramAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        assignment.setPermissionLevel(newPermissionLevel);
        return assignmentRepository.save(assignment);
    }

    /**
     * Get assignments created by user
     */
    @Transactional(readOnly = true)
    public List<DiagramAssignment> getAssignmentsByCreator(String createdBy) {
        return assignmentRepository.findByAssignedByAndIsActiveTrueOrderByAssignedTimeDesc(createdBy);
    }
}