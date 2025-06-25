package bpmnProject.akon.bpmnJavaBackend.Settings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPreferenceRepository extends JpaRepository<UserPreferences, Long> {
    Optional<UserPreferences> findByUserId(Integer userId);
    void deleteByUserId(Integer userId);
}
