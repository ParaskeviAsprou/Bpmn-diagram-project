package bpmnProject.akon.bpmnJavaBackend.User;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/groups")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class GroupController {

    private final GroupService groupService;

    /**
     * Create new group (Admin only)
     */
    @PostMapping
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Group> createGroup(@RequestBody CreateGroupRequest request, Principal principal) {
        Group group = groupService.createGroup(
                request.getName(),
                request.getDescription(),
                principal.getName()
        );
        return ResponseEntity.ok(group);
    }

    /**
     * Update group (Admin only)
     */
    @PutMapping("/{groupId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Group> updateGroup(
            @PathVariable Long groupId,
            @RequestBody UpdateGroupRequest request) {
        Group group = groupService.updateGroup(groupId, request.getName(), request.getDescription());
        return ResponseEntity.ok(group);
    }

    /**
     * Delete group (Admin only)
     */
    @DeleteMapping("/{groupId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, String>> deleteGroup(@PathVariable Long groupId) {
        groupService.deleteGroup(groupId);
        return ResponseEntity.ok(Map.of("message", "Group deleted successfully"));
    }

    /**
     * Get all groups
     */
    @GetMapping
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<Group>> getAllGroups() {
        List<Group> groups = groupService.getAllActiveGroups();
        return ResponseEntity.ok(groups);
    }

    /**
     * Get groups with user count (Admin only)
     */
    @GetMapping("/with-user-count")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<GroupService.GroupInfo>> getGroupsWithUserCount() {
        List<GroupService.GroupInfo> groups = groupService.getGroupsWithUserCount();
        return ResponseEntity.ok(groups);
    }

    /**
     * Add user to group (Admin only)
     */
    @PostMapping("/{groupId}/users/{userId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Group> addUserToGroup(@PathVariable Long groupId, @PathVariable Integer userId) {
        Group group = groupService.addUserToGroup(groupId, userId);
        return ResponseEntity.ok(group);
    }

    /**
     * Remove user from group (Admin only)
     */
    @DeleteMapping("/{groupId}/users/{userId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Group> removeUserFromGroup(@PathVariable Long groupId, @PathVariable Integer userId) {
        Group group = groupService.removeUserFromGroup(groupId, userId);
        return ResponseEntity.ok(group);
    }

    /**
     * Add multiple users to group (Admin only)
     */
    @PostMapping("/{groupId}/users")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Group> addUsersToGroup(
            @PathVariable Long groupId,
            @RequestBody Set<Integer> userIds) {
        Group group = groupService.addUsersToGroup(groupId, userIds);
        return ResponseEntity.ok(group);
    }

    /**
     * Search groups
     */
    @GetMapping("/search")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<Group>> searchGroups(@RequestParam String q) {
        List<Group> groups = groupService.searchGroups(q);
        return ResponseEntity.ok(groups);
    }

    /**
     * Get user's groups
     */
    @GetMapping("/my-groups")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<Group>> getMyGroups(Principal principal) {
        // This would need the current user ID - you'd need to get it from the authentication
        // For now, returning empty list
        return ResponseEntity.ok(List.of());
    }

    public static class CreateGroupRequest {
        private String name;
        private String description;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    public static class UpdateGroupRequest {
        private String name;
        private String description;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }
}