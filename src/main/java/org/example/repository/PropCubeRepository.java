package org.example.repository;

import org.example.dto.PropCube;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PropCubeRepository extends JpaRepository<PropCube, Long> {
    // 根据用户名查询所有道具Cube
    List<PropCube> findByUsername(String username);

    // 根据ID和用户名查询道具Cube（权限验证）
    Optional<PropCube> findByIdAndUsername(Long id, String username);

    // 删除用户所有道具Cube
    void deleteByUsername(String username);

    // 根据索引和用户名查询（用于删除权限校验）
    Optional<PropCube> findByIndexAndUsername(int index, String username);

    // 检查索引是否已存在（跨用户唯一）
    boolean existsByIndex(int index);

}