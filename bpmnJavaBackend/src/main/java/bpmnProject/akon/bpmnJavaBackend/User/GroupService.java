package bpmnProject.akon.bpmnJavaBackend.User;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

    /**
     * Create new group
     */
    @Transactional
    public Group createGroup(String name, String description, String createdBy) {
        if (groupRepository.existsByName(name)) {
            throw new RuntimeException("Group with name '" + name + "' already exists");
        }

        Group group = Group.builder()
                .name(name)
                .description(description)
                .createdBy(createdBy)
                .uploadTime(LocalDateTime.now())
                .isActive(true)
                .build();

        return groupRepository.save(group);
    }

    /**
     * Update group
     */
    @Transactional
    public Group updateGroup(Long groupId, String name, String description) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Check if name is being changed and if new name exists
        if (!group.getName().equals(name) && groupRepository.existsByName(name)) {
            throw new RuntimeException("Group with name '" + name + "' already exists");
        }

        group.setName(name);
        group.setDescription(description);
        return groupRepository.save(group);
    }

    /**
     * Delete group (soft delete)
     */
    @Transactional
    public void deleteGroup(Long groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        group.setIsActive(false);
        groupRepository.save(group);
    }

    /**
     * Add user to group
     */
    @Transactional
    public Group addUserToGroup(Long groupId, Integer userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        group.addUser(user);
        return groupRepository.save(group);
    }

    /**
     * Remove user from group
     */
    @Transactional
    public Group removeUserFromGroup(Long groupId, Integer userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        group.removeUser(user);
        return groupRepository.save(group);
    }

    /**
     * Add multiple users to group
     */
    @Transactional
    public Group addUsersToGroup(Long groupId, Set<Integer> userIds) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        for (Integer userId : userIds) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));
            group.addUser(user);
        }

        return groupRepository.save(group);
    }

    /**
     * Get all active groups
     */
    @Transactional(readOnly = true)
    public List<Group> getAllActiveGroups() {
        return groupRepository.findByIsActiveTrue();
    }

    /**
     * Get group by id
     */
    @Transactional(readOnly = true)
    public Optional<Group> getGroupById(Long groupId) {
        return groupRepository.findById(groupId);
    }

    /**
     * Get groups by user
     */
    @Transactional(readOnly = true)
    public List<Group> getGroupsByUser(Integer userId) {
        return groupRepository.findByUserId(userId);
    }

    /**
     * Search groups
     */
    @Transactional(readOnly = true)
    public List<Group> searchGroups(String searchTerm) {
        return groupRepository.searchGroups(searchTerm);
    }

    /**
     * Get groups with user count
     */
    @Transactional(readOnly = true)
    public List<GroupInfo> getGroupsWithUserCount() {
        List<Object[]> results = groupRepository.findGroupsWithUserCount();
        return results.stream()
                .map(result -> new GroupInfo((Group) result[0], ((Number) result[1]).intValue()))
                .toList();
    }

    /**
     * Check if user is in group
     */
    @Transactional(readOnly = true)
    public boolean isUserInGroup(Long groupId, Integer userId) {
        Group group = groupRepository.findById(groupId).orElse(null);
        if (group == null) return false;

        return group.getUsers().stream()
                .anyMatch(user -> user.getId().equals(userId));
    }

    public static class GroupInfo {
        private final Group group;
        private final int userCount;

        public GroupInfo(Group group, int userCount) {
            this.group = group;
            this.userCount = userCount;
        }

        public Group getGroup() { return group; }
        public int getUserCount() { return userCount; }
    }
}