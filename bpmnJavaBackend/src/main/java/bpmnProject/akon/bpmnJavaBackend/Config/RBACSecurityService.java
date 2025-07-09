package bpmnProject.akon.bpmnJavaBackend.Config;

import bpmnProject.akon.bpmnJavaBackend.File.DiagramAssignment;
import bpmnProject.akon.bpmnJavaBackend.File.DiagramAssignmentService;
import bpmnProject.akon.bpmnJavaBackend.User.RoleHierarchyService;
import bpmnProject.akon.bpmnJavaBackend.User.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service("rbacSecurity")
@RequiredArgsConstructor
public class RBACSecurityService {

    private final DiagramAssignmentService assignmentService;
    private final RoleHierarchyService roleHierarchyService;

    /**
     * Check if current user can view a diagram
     */
    public boolean canViewDiagram(Long diagramId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return false;

        // Admins can view everything
        if (currentUser.hasRole("ROLE_ADMIN")) return true;

        // Check assignment-based access
        return assignmentService.hasUserAccessToDiagram(diagramId, currentUser);
    }

    /**
     * Check if current user can edit a diagram
     */
    public boolean canEditDiagram(Long diagramId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return false;

        // Admins can edit everything
        if (currentUser.hasRole("ROLE_ADMIN")) return true;

        // Viewers cannot edit
        if (currentUser.hasRole("ROLE_VIEWER") && !currentUser.hasRole("ROLE_MODELER")) {
            return false;
        }

        // Check if user has EDIT or ADMIN permission on this diagram
        DiagramAssignment.PermissionLevel permissionLevel = assignmentService.getUserPermissionLevel(diagramId, currentUser);
        return permissionLevel == DiagramAssignment.PermissionLevel.EDIT ||
                permissionLevel == DiagramAssignment.PermissionLevel.ADMIN;
    }

    /**
     * Check if current user can assign/share a diagram
     */
    public boolean canAssignDiagram(Long diagramId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return false;

        // Admins can assign everything
        if (currentUser.hasRole("ROLE_ADMIN")) return true;

        // Only modelers can assign
        if (!currentUser.hasRole("ROLE_MODELER")) return false;

        // Check if user has ADMIN permission on this diagram
        DiagramAssignment.PermissionLevel permissionLevel = assignmentService.getUserPermissionLevel(diagramId, currentUser);
        return permissionLevel == DiagramAssignment.PermissionLevel.ADMIN;
    }

    /**
     * Check if current user can manage roles (admin only)
     */
    public boolean canManageRoles() {
        User currentUser = getCurrentUser();
        return currentUser != null && currentUser.hasRole("ROLE_ADMIN");
    }

    /**
     * Check if current user can manage groups (admin only)
     */
    public boolean canManageGroups() {
        User currentUser = getCurrentUser();
        return currentUser != null && currentUser.hasRole("ROLE_ADMIN");
    }

    /**
     * Check if current user can access role through hierarchy
     */
    public boolean canAccessRole(Integer roleId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return false;

        // Admins can access all roles
        if (currentUser.hasRole("ROLE_ADMIN")) return true;

        // Check role hierarchy access
        return roleHierarchyService.canUserAccessRole(currentUser, roleId);
    }

    /**
     * Check if current user is admin or the user being accessed
     */
    public boolean canAccessUserData(Integer userId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return false;

        // Admins can access all user data
        if (currentUser.hasRole("ROLE_ADMIN")) return true;

        // Users can access their own data
        return currentUser.getId().equals(userId);
    }

    /**
     * Get current authenticated user
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }

        return null;
    }
}
