package bpmnProject.akon.bpmnJavaBackend.Token;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface TokenRepository extends JpaRepository<Token, Integer> {

    @Query(value = """
            SELECT t FROM Token t 
            INNER JOIN User u ON t.user.id = u.id 
            WHERE u.id = :id AND (t.expired = false AND t.revoked = false)
            """)
    List<Token> findAllValidTokenByUser(@Param("id") Integer id);

    Optional<Token> findByToken(String token);

    @Query("SELECT t FROM Token t WHERE t.user.id = :userId")
    List<Token> findAllByUserId(@Param("userId") Integer userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Token t WHERE t.user.id = :userId AND (t.expired = true OR t.revoked = true)")
    void deleteExpiredTokensByUserId(@Param("userId") Integer userId);

    @Modifying
    @Transactional
    @Query("UPDATE Token t SET t.expired = true, t.revoked = true WHERE t.user.id = :userId")
    void revokeAllTokensByUserId(@Param("userId") Integer userId);
}