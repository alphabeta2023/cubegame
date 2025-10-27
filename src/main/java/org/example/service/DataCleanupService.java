package org.example.service;

import org.example.repository.CubeRepository;
import org.example.repository.MapDataRepository;
import org.example.repository.PropCubeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DataCleanupService {

    private final CubeRepository cubeRepository;
    private final MapDataRepository mapDataRepository;
    private final UserService userService;
    private final PropCubeRepository propCubeRepository;

    @Autowired
    public DataCleanupService(CubeRepository cubeRepository,
                              MapDataRepository mapDataRepository,
                              UserService userService, PropCubeRepository propCubeRepository) {
        this.cubeRepository = cubeRepository;
        this.mapDataRepository = mapDataRepository;
        this.userService = userService;
        this.propCubeRepository = propCubeRepository;
    }

    /**
     * 删除指定用户的所有数据（包括道具）
     * @param username 用户名
     * @return 是否删除成功
     */
    @Transactional
    public boolean deleteUserAllData(String username) {
        // 验证用户是否存在
        if (userService.findByUsername(username) == null) {
            return false;
        }

        // 删除用户的cube数据
        cubeRepository.deleteByUsername(username);

        // 删除用户的mapdata数据
        mapDataRepository.deleteByUsername(username);

        // 删除用户的道具数据
        propCubeRepository.deleteByUsername(username);

        return true;
    }
}