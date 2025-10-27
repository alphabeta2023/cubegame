// MapDataService.java
package org.example.service;

import org.example.dto.Cube;
import org.example.dto.MapData;
import org.example.dto.Position;
import org.example.repository.MapDataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class MapDataService {

    private final MapDataRepository mapDataRepository;

    @Autowired
    public MapDataService(MapDataRepository mapDataRepository) {
        this.mapDataRepository = mapDataRepository;
    }

    // 根据用户名获取所有地图数据
    public List<MapData> getMapDataByUsername(String username) {
        // 需要在MapDataRepository中添加该方法
        return mapDataRepository.findByUsername(username);
    }

    // 根据立方体信息更新地图数据
    public void updateMapData(Cube cube) {
        String username = cube.getUsername();
        Position position = cube.getPosition();
        double size = cube.getSize();
        String color = cube.getColor();
        int renderOrder = cube.getRenderOrder(); // 获取Cube的渲染顺序

        MapData mapData = new MapData(username, position.getX(), position.getZ(), color, size);
        mapData.setRenderOrder(renderOrder); // 设置与Cube相同的渲染顺序

        mapDataRepository.save(mapData);
    }

    /**
     * 清理被后续多个MapData完全覆盖（无空隙）的旧数据
     */
    @Transactional
    public void cleanUpOverlappedMapData(String username) {
        // 获取该用户的所有MapData，按ID升序排列（旧数据在前）
        List<MapData> allMapData = mapDataRepository.findByUsernameOrderByIdAsc(username);
        if (allMapData.size() <= 1) {
            return; // 数据量不足，无需清理
        }

        List<MapData> toDelete = new ArrayList<>();

        // 检查每个MapData是否被后续数据完全覆盖
        for (int i = 0; i < allMapData.size(); i++) {
            MapData current = allMapData.get(i);
            if (toDelete.contains(current)) {
                continue;
            }

            // 获取当前数据之后的所有数据（ID更大的）
            List<MapData> subsequentData = allMapData.subList(i + 1, allMapData.size());
            if (subsequentData.isEmpty()) {
                continue;
            }

            // 检查当前MapData是否被后续数据完全覆盖（无空隙）
            if (isFullyCoveredBySubsequent(current, subsequentData)) {
                toDelete.add(current);
            }
        }

        // 执行删除
        if (!toDelete.isEmpty()) {
            mapDataRepository.deleteAll(toDelete);
        }
    }

    /**
     * 检查当前MapData是否被后续数据完全覆盖（无空隙）
     */
    private boolean isFullyCoveredBySubsequent(MapData current, List<MapData> subsequentData) {
        // 获取当前MapData的关键点位（4个顶点 + 4条边中点，共8个点）
        List<Point> currentKeyPoints = getKeyPoints(current);

        // 检查每个关键点位是否被至少一个后续MapData覆盖
        for (Point point : currentKeyPoints) {
            boolean isCovered = false;
            // 检查该点是否被某个后续MapData覆盖
            for (MapData later : subsequentData) {
                if (isPointCovered(point, later)) {
                    isCovered = true;
                    break;
                }
            }
            // 只要有一个点未被覆盖，当前MapData就不满足删除条件
            if (!isCovered) {
                return false;
            }
        }
        return true;
    }

    /**
     * 获取正方形的关键点位（用于验证覆盖范围）
     */
    private List<Point> getKeyPoints(MapData data) {
        double halfSize = data.getSize() / 2;
        double x = data.getX();
        double z = data.getZ();

        List<Point> points = new ArrayList<>();
        // 4个顶点
        points.add(new Point(x - halfSize, z - halfSize)); // 左下
        points.add(new Point(x + halfSize, z - halfSize)); // 右下
        points.add(new Point(x - halfSize, z + halfSize)); // 左上
        points.add(new Point(x + halfSize, z + halfSize)); // 右上
        // 4条边中点
        points.add(new Point(x, z - halfSize)); // 下中
        points.add(new Point(x, z + halfSize)); // 上中
        points.add(new Point(x - halfSize, z)); // 左中
        points.add(new Point(x + halfSize, z)); // 右中
        return points;
    }

    /**
     * 判断一个点是否被某个MapData的正方形区域覆盖
     */
    private boolean isPointCovered(Point point, MapData data) {
        double halfSize = data.getSize() / 2;
        double dataXMin = data.getX() - halfSize;
        double dataXMax = data.getX() + halfSize;
        double dataZMin = data.getZ() - halfSize;
        double dataZMax = data.getZ() + halfSize;

        // 点的坐标是否在当前MapData的范围内
        return point.x >= dataXMin && point.x <= dataXMax
                && point.z >= dataZMin && point.z <= dataZMax;
    }

    /**
     * 内部类：表示一个坐标点
     */
    private static class Point {
        double x;
        double z;

        Point(double x, double z) {
            this.x = x;
            this.z = z;
        }
    }
}