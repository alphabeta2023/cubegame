package org.example.repository;

import org.example.dto.Cube;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CubeRepository extends JpaRepository<Cube, Long> {
    // 按用户名查询cube
    Optional<Cube> findByUsername(String username);

    void deleteByUsername(String username);

    boolean existsByUsername(String username);

    List<Cube> findAllByisPaused(boolean b);
}