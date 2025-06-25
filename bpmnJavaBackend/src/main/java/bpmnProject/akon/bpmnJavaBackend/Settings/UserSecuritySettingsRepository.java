package bpmnProject.akon.bpmnJavaBackend.Settings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserSecuritySettingsRepository extends JpaRepository<UserSecuritySettings, Long> {
    Optional<UserSecuritySettings> findByUserId(Integer userId);
    void deleteByUserId(Integer userId);
}

