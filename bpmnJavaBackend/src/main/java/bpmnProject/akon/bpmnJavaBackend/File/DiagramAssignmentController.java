package bpmnProject.akon.bpmnJavaBackend.File;

import bpmnProject.akon.bpmnJavaBackend.User.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/diagrams")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class DiagramAssignmentController {

    private final DiagramAssignmentService assignmentService;

    /**
     * Get diagrams available to current user
     */
    @GetMapping("/available-to-user")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<File>> getAvailableDiagrams(Principal principal) {
        User currentUser = (User) ((UsernamePasswordAuthenticationToken) principal).getPrincipal();
        List<File> diagrams = assignmentService.getAccessibleDiagrams(currentUser);
        return ResponseEntity.ok(diagrams);
    }

    /**
     * Assign diagram to user
     */
    @PostMapping("/{diagramId}/assign/user")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramAssignment> assignToUser(
            @PathVariable Long diagramId,
            @RequestBody AssignToUserRequest request,
            Principal principal) {

        DiagramAssignment assignment = assignmentService.assignDiagramToUser(
                diagramId,
                request.getUserId(),
                request.getPermissionLevel(),
                principal.getName(),
                request.getNotes()
        );
        return ResponseEntity.ok(assignment);
    }

    /**
     * Assign diagram to group
     */
    @PostMapping("/{diagramId}/assign/group")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramAssignment> assignToGroup(
            @PathVariable Long diagramId,
            @RequestBody AssignToGroupRequest request,
            Principal principal) {

        DiagramAssignment assignment = assignmentService.assignDiagramToGroup(
                diagramId,
                request.getGroupId(),
                request.getPermissionLevel(),
                principal.getName(),
                request.getNotes()
        );
        return ResponseEntity.ok(assignment);
    }

    /**
     * Assign diagram to role
     */
    @PostMapping("/{diagramId}/assign/role")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramAssignment> assignToRole(
            @PathVariable Long diagramId,
            @RequestBody AssignToRoleRequest request,
            Principal principal) {

        DiagramAssignment assignment = assignmentService.assignDiagramToRole(
                diagramId,
                request.getRoleId(),
                request.getPermissionLevel(),
                principal.getName(),
                request.getNotes()
        );
        return ResponseEntity.ok(assignment);
    }

    /**
     * Get diagram assignments
     */
    @GetMapping("/{diagramId}/assignments")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<DiagramAssignment>> getDiagramAssignments(@PathVariable Long diagramId) {
        List<DiagramAssignment> assignments = assignmentService.getDiagramAssignments(diagramId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Remove assignment
     */
    @DeleteMapping("/assignments/{assignmentId}")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, String>> removeAssignment(@PathVariable Long assignmentId) {
        assignmentService.removeAssignment(assignmentId);
        return ResponseEntity.ok(Map.of("message", "Assignment removed successfully"));
    }

    /**
     * Update assignment permission
     */
    @PutMapping("/assignments/{assignmentId}/permission")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramAssignment> updateAssignmentPermission(
            @PathVariable Long assignmentId,
            @RequestBody Map<String, DiagramAssignment.PermissionLevel> request) {

        DiagramAssignment updated = assignmentService.updateAssignmentPermission(
                assignmentId,
                request.get("permissionLevel")
        );
        return ResponseEntity.ok(updated);
    }

    /**
     * Check user access to diagram
     */
    @GetMapping("/{diagramId}/access")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> checkDiagramAccess(
            @PathVariable Long diagramId,
            Principal principal) {

        User currentUser = (User) ((UsernamePasswordAuthenticationToken) principal).getPrincipal();
        boolean hasAccess = assignmentService.hasUserAccessToDiagram(diagramId, currentUser);
        DiagramAssignment.PermissionLevel permissionLevel = assignmentService.getUserPermissionLevel(diagramId, currentUser);

        return ResponseEntity.ok(Map.of(
                "hasAccess", hasAccess,
                "permissionLevel", permissionLevel
        ));
    }
    public static class AssignToUserRequest {
        private Integer userId;
        private DiagramAssignment.PermissionLevel permissionLevel;
        private String notes;

        public Integer getUserId() { return userId; }
        public void setUserId(Integer userId) { this.userId = userId; }
        public DiagramAssignment.PermissionLevel getPermissionLevel() { return permissionLevel; }
        public void setPermissionLevel(DiagramAssignment.PermissionLevel permissionLevel) { this.permissionLevel = permissionLevel; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }

    public static class AssignToGroupRequest {
        private Long groupId;
        private DiagramAssignment.PermissionLevel permissionLevel;
        private String notes;

        public Long getGroupId() { return groupId; }
        public void setGroupId(Long groupId) { this.groupId = groupId; }
        public DiagramAssignment.PermissionLevel getPermissionLevel() { return permissionLevel; }
        public void setPermissionLevel(DiagramAssignment.PermissionLevel permissionLevel) { this.permissionLevel = permissionLevel; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }

    public static class AssignToRoleRequest {
        private Integer roleId;
        private DiagramAssignment.PermissionLevel permissionLevel;
        private String notes;

        public Integer getRoleId() { return roleId; }
        public void setRoleId(Integer roleId) { this.roleId = roleId; }
        public DiagramAssignment.PermissionLevel getPermissionLevel() { return permissionLevel; }
        public void setPermissionLevel(DiagramAssignment.PermissionLevel permissionLevel) { this.permissionLevel = permissionLevel; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }
}