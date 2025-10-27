// MapDataRepository.java
package org.example.repository;

import org.example.dto.MapData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MapDataRepository extends JpaRepository<MapData, Long> {
    // 新增按用户名查询所有地图数据的方法
    List<MapData> findByUsername(String username);

    void deleteByUsername(String username);

    // 新增：按用户名查询并按ID升序排列
    List<MapData> findByUsernameOrderByIdAsc(String username);
}