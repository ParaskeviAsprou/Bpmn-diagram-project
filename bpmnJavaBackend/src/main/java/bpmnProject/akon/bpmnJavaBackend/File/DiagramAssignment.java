package bpmnProject.akon.bpmnJavaBackend.File;

import bpmnProject.akon.bpmnJavaBackend.User.Group;
import bpmnProject.akon.bpmnJavaBackend.User.Role;
import bpmnProject.akon.bpmnJavaBackend.User.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "diagram_assignment")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@ToString

public class DiagramAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false)
    private File diagram;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User assignedUser;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private Group assignedGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private Role assignedRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_type", nullable = false)
    private AssignmentType assignmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission_level")
    @Builder.Default
    private PermissionLevel permissionLevel = PermissionLevel.VIEW;

    @Column(name = "assigned_by")
    private String assignedBy;

    @Column(name = "assigned_time")
    private LocalDateTime assignedTime;

    @Column(name = "notes")
    private String notes;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @PrePersist
    public void prePersist() {
        if (assignedTime == null) {
            assignedTime = LocalDateTime.now();
        }
        if (isActive == null) {
            isActive = true;
        }
    }

    public enum AssignmentType {
        USER,
        GROUP,
        ROLE
    }

    public enum PermissionLevel {
        VIEW,
        EDIT,
        ADMIN
    }

    // Helper methods
    public String getAssignedToName() {
        return switch (assignmentType) {
            case USER -> assignedUser != null ? assignedUser.getFullName() : "Unknown User";
            case GROUP -> assignedGroup != null ? assignedGroup.getName() : "Unknown Group";
            case ROLE -> assignedRole != null ? assignedRole.getDisplayName() : "Unknown Role";
            default -> "Unknown";
        };
    }

    public boolean isAssignedTo(User user) {
        if (assignmentType == AssignmentType.USER) {
            return assignedUser != null && assignedUser.getId().equals(user.getId());
        } else if (assignmentType == AssignmentType.GROUP) {
            return assignedGroup != null && assignedGroup.hasUser(user);
        } else if (assignmentType == AssignmentType.ROLE) {
            return assignedRole != null && user.hasRole(assignedRole.getName());
        }
        return false;
    }
}
