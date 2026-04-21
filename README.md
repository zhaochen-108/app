# 宝贝课程表 - 微信小程序

多个宝妈协作管理孩子课程表，合并查看空闲时间的小工具。

## 功能

- 📝 录入孩子的每周课程表
- 👨‍👩‍👧‍👦 创建家庭组，邀请其他宝妈加入
- 🔍 合并视图，一眼看到多个孩子的共同空闲时段
- 🎨 不同孩子用不同颜色区分

## 技术栈

- 微信小程序原生开发
- 微信云开发（数据库 + 云函数）

## 项目结构

```
kids-schedule/
├── cloudfunctions/          # 云函数
│   ├── login/              # 登录
│   ├── manageChild/        # 孩子管理
│   ├── manageSchedule/     # 课程表管理
│   ├── manageGroup/        # 家庭组管理
│   └── getMergedView/      # 合并视图
├── miniprogram/            # 小程序前端
│   ├── pages/
│   │   ├── index/          # 首页
│   │   ├── schedule/       # 课程表编辑
│   │   ├── groups/         # 家庭组
│   │   └── merge/          # 合并视图
│   ├── components/         # 公共组件
│   ├── utils/              # 工具函数
│   └── images/             # 图片资源
├── project.config.json
└── README.md
```

## 数据模型

### users（用户）
| 字段 | 类型 | 说明 |
|------|------|------|
| _openid | string | 微信openid（自动） |
| nickName | string | 昵称 |
| avatarUrl | string | 头像 |
| createdAt | date | 创建时间 |

### children（孩子）
| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 孩子ID |
| userId | string | 所属用户openid |
| name | string | 孩子姓名 |
| color | string | 显示颜色 |
| createdAt | date | 创建时间 |

### schedules（课程表）
| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 记录ID |
| childId | string | 孩子ID |
| userId | string | 所属用户openid |
| dayOfWeek | number | 星期几（1-7） |
| startTime | string | 开始时间（如 "08:00"） |
| endTime | string | 结束时间（如 "09:30"） |
| courseName | string | 课程名称 |
| location | string | 上课地点（可选） |

### groups（家庭组）
| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 组ID |
| name | string | 组名称 |
| creatorId | string | 创建者openid |
| inviteCode | string | 6位邀请码 |
| members | array | 成员列表 [{userId, nickName, role}] |
| children | array | 组内孩子 [{childId, childName, userId}] |
| createdAt | date | 创建时间 |

## 开发指南

1. 在微信开发者工具中导入项目
2. 填入你的 AppID
3. 开通云开发环境
4. 上传云函数
5. 开始开发调试
