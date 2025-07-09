package bpmnProject.akon.bpmnJavaBackend.User;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "role_hierarchy")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleHierarchy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "parent_role_id", nullable = false)
    private Integer parentRoleId;

    @Column(name = "child_role_id", nullable = false)
    private Integer childRoleId;

    @Column(name = "hierarchy_level", nullable = false)
    @Builder.Default
    private Integer hierarchyLevel = 1;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private String createdBy;

    // Add relationships to actual Role entities
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_role_id", insertable = false, updatable = false)
    private Role parentRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_role_id", insertable = false, updatable = false)
    private Role childRole;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}