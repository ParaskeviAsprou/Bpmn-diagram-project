package bpmnProject.akon.bpmnJavaBackend.User;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/role-hierarchy")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class RoleHierarchyController {

    private final RoleHierarchyService roleHierarchyService;

    /**
     * Get role hierarchy tree
     */
    @GetMapping("/tree")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<RoleHierarchyService.RoleTreeNode>> getRoleHierarchyTree() {
        List<RoleHierarchyService.RoleTreeNode> tree = roleHierarchyService.getRoleHierarchyTree();
        return ResponseEntity.ok(tree);
    }

    /**
     * Create role hierarchy relationship
     */
    @PostMapping
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<RoleHierarchy> createHierarchy(@RequestBody CreateHierarchyRequest request) {
        RoleHierarchy hierarchy = roleHierarchyService.createHierarchy(
                request.getParentRoleId(),
                request.getChildRoleId(),
                request.getHierarchyLevel()
        );
        return ResponseEntity.ok(hierarchy);
    }

    /**
     * Delete role hierarchy relationship
     */
    @DeleteMapping("/{hierarchyId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, String>> deleteHierarchy(@PathVariable Long hierarchyId) {
        roleHierarchyService.deleteHierarchy(hierarchyId);
        return ResponseEntity.ok(Map.of("message", "Role hierarchy deleted successfully"));
    }

    /**
     * Get all hierarchies
     */
    @GetMapping
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<RoleHierarchy>> getAllHierarchies() {
        List<RoleHierarchy> hierarchies = roleHierarchyService.getAllHierarchies();
        return ResponseEntity.ok(hierarchies);
    }

    /**
     * Get child roles for a parent role
     */
    @GetMapping("/parent/{parentRoleId}/children")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<Role>> getChildRoles(@PathVariable Integer parentRoleId) {
        List<Role> childRoles = roleHierarchyService.getChildRoles(parentRoleId);
        return ResponseEntity.ok(childRoles);
    }

    /**
     * Update hierarchy level
     */
    @PutMapping("/{hierarchyId}/level")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<RoleHierarchy> updateHierarchyLevel(
            @PathVariable Long hierarchyId,
            @RequestBody Map<String, Integer> request) {
        RoleHierarchy updated = roleHierarchyService.updateHierarchyLevel(hierarchyId, request.get("level"));
        return ResponseEntity.ok(updated);
    }

    public static class CreateHierarchyRequest {
        private Integer parentRoleId;
        private Integer childRoleId;
        private Integer hierarchyLevel;

        // Getters and Setters
        public Integer getParentRoleId() { return parentRoleId; }
        public void setParentRoleId(Integer parentRoleId) { this.parentRoleId = parentRoleId; }
        public Integer getChildRoleId() { return childRoleId; }
        public void setChildRoleId(Integer childRoleId) { this.childRoleId = childRoleId; }
        public Integer getHierarchyLevel() { return hierarchyLevel; }
        public void setHierarchyLevel(Integer hierarchyLevel) { this.hierarchyLevel = hierarchyLevel; }
    }
}