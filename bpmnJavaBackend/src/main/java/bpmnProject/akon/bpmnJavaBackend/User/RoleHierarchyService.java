package bpmnProject.akon.bpmnJavaBackend.User;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RoleHierarchyService {
    private final RoleHierarchyRepository roleHierarchyRepository;
    private final RoleRepository roleRepository;

    public RoleHierarchyService(RoleHierarchyRepository roleHierarchyRepository, RoleRepository roleRepository) {
        this.roleHierarchyRepository = roleHierarchyRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional
    public RoleHierarchy createHierarchy(Integer parentRoleId, Integer childRoleId, Integer hierarchyLevel) {
        Role parentRole = roleRepository.findById(Long.valueOf(parentRoleId))
                .orElseThrow(() -> new RuntimeException("Parent role not found"));
        Role childRole = roleRepository.findById(Long.valueOf(childRoleId))
                .orElseThrow(() -> new RuntimeException("Child role not found"));

        Optional<RoleHierarchy> existing = roleHierarchyRepository.findByParentAndChild(parentRoleId, childRoleId);
        if (existing.isPresent()) {
            throw new RuntimeException("Hierarchy already exists between these roles");
        }

        if (wouldCreateCircularDependency(parentRoleId, childRoleId)) {
            throw new RuntimeException("Cannot create hierarchy: would create circular dependency");
        }

        RoleHierarchy hierarchy = RoleHierarchy.builder()
                .parentRoleId(parentRoleId)
                .childRoleId(childRoleId)
                .hierarchyLevel(hierarchyLevel != null ? hierarchyLevel : 1)
                .isActive(true)
                .build();

        return roleHierarchyRepository.save(hierarchy);
    }

    // Overloaded method to handle Long parameters (for backward compatibility with DataLoader)
    @Transactional
    public RoleHierarchy createHierarchy(Long parentRoleId, Long childRoleId, Integer hierarchyLevel) {
        return createHierarchy(parentRoleId.intValue(), childRoleId.intValue(), hierarchyLevel);
    }

    @Transactional
    public void deleteHierarchy(Long hierarchyId) {
        RoleHierarchy hierarchy = roleHierarchyRepository.findById(hierarchyId)
                .orElseThrow(() -> new RuntimeException("Role hierarchy not found"));

        hierarchy.setIsActive(false);
        roleHierarchyRepository.save(hierarchy);
    }

    @Transactional(readOnly = true)
    public Set<Integer> getAllAccessibleRoleIds(User user) {
        Set<Integer> accessibleRoleIds = new HashSet<>();

        // Add user's direct roles
        user.getRoles().forEach(role -> {
            accessibleRoleIds.add(role.getId());
            // Add all child roles recursively
            List<Integer> childRoleIds = roleHierarchyRepository.findAllAccessibleRoleIds(role.getId());
            accessibleRoleIds.addAll(childRoleIds);
        });

        return accessibleRoleIds;
    }

    @Transactional(readOnly = true)
    public List<RoleTreeNode> getRoleHierarchyTree() {
        List<Role> topLevelRoles = roleHierarchyRepository.findTopLevelRoles();
        List<RoleHierarchy> allHierarchies = roleHierarchyRepository.findAllActiveHierarchies();

        return topLevelRoles.stream()
                .map(role -> buildRoleTree(role, allHierarchies, new HashSet<>()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Role> getChildRoles(Integer parentRoleId) {
        List<RoleHierarchy> hierarchies = roleHierarchyRepository.findByParentRoleId(parentRoleId);
        return hierarchies.stream()
                .map(RoleHierarchy::getChildRole)
                .filter(Objects::nonNull) // Add null check for safety
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Role> getParentRoles(Integer childRoleId) {
        List<RoleHierarchy> hierarchies = roleHierarchyRepository.findByChildRoleId(childRoleId);
        return hierarchies.stream()
                .map(RoleHierarchy::getParentRole)
                .filter(Objects::nonNull) // Add null check for safety
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RoleHierarchy> getAllHierarchies() {
        return roleHierarchyRepository.findAllActiveHierarchies();
    }

    @Transactional(readOnly = true)
    public boolean canUserAccessRole(User user, Integer targetRoleId) {
        Set<Integer> accessibleRoleIds = getAllAccessibleRoleIds(user);
        return accessibleRoleIds.contains(targetRoleId);
    }

    @Transactional
    public RoleHierarchy updateHierarchyLevel(Long hierarchyId, Integer newLevel) {
        RoleHierarchy hierarchy = roleHierarchyRepository.findById(hierarchyId)
                .orElseThrow(() -> new RuntimeException("Role hierarchy not found"));

        hierarchy.setHierarchyLevel(newLevel);
        return roleHierarchyRepository.save(hierarchy);
    }

    private boolean wouldCreateCircularDependency(Integer parentRoleId, Integer childRoleId) {
        // If childRole is already a parent of parentRole (directly or indirectly),
        // then adding parentRole as parent of childRole would create a cycle
        try {
            List<Integer> accessibleFromChild = roleHierarchyRepository.findAllAccessibleRoleIds(childRoleId);
            return accessibleFromChild.contains(parentRoleId);
        } catch (Exception e) {
            // If there's an issue with the query, assume no circular dependency for safety
            return false;
        }
    }

    private RoleTreeNode buildRoleTree(Role role, List<RoleHierarchy> allHierarchies, Set<Integer> visited) {
        if (visited.contains(role.getId())) {
            // Avoid infinite recursion in case of circular dependencies
            return new RoleTreeNode(role, new ArrayList<>());
        }

        visited.add(role.getId());

        List<Role> children = allHierarchies.stream()
                .filter(h -> h.getParentRole() != null && h.getParentRole().getId().equals(role.getId()))
                .map(RoleHierarchy::getChildRole)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        List<RoleTreeNode> childNodes = children.stream()
                .map(childRole -> buildRoleTree(childRole, allHierarchies, new HashSet<>(visited)))
                .collect(Collectors.toList());

        visited.remove(role.getId());

        return new RoleTreeNode(role, childNodes);
    }

    public static class RoleTreeNode {
        private final Role role;
        private final List<RoleTreeNode> children;

        public RoleTreeNode(Role role, List<RoleTreeNode> children) {
            this.role = role;
            this.children = children;
        }

        public Role getRole() { return role; }
        public List<RoleTreeNode> getChildren() { return children; }
        public boolean hasChildren() { return !children.isEmpty(); }
        public int getChildCount() { return children.size(); }
    }
}