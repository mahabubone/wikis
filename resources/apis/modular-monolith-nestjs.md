# Modular Monolith - NestJS with PostgreSQL, Redis & Message Queues

Source: https://modular-monolith.com/architecture-guide/pgsql-redis-mq

> A comprehensive guide for building a modular monolith using NestJS with PostgreSQL for persistence, Redis for caching/session management, and multiple message queues for asynchronous communication.

## Overview

A modular monolith is an application architecture that balances the simplicity of a monolith with the internal modularity and performance characteristics of microservices. This pattern enables teams to scale their applications without the operational complexity of distributed systems.

**Core Benefits:**
- Single codebase and database (developer productivity)
- Internal modularity (technical scalability)
- Simplified deployment (operational simplicity)
- Strong data consistency (ACID compliance)
- Easy testing and debugging

## Architecture Overview

The modular monolith follows a three-tier pattern:

1. **Presentation Layer** - Controllers and handlers
2. **Application Layer** - Use cases and business logic
3. **Domain Layer** - Models and repositories
4. **Infrastructure Layer** - Database, cache, and messaging

## Technology Stack

### Core Frameworks
- **NestJS** - Progressive Node.js framework with TypeScript
- **PostgreSQL** - Relational database with ACID guarantees
- **Redis** - In-memory data store for caching and sessions
- **NATS** - Lightweight messaging system
- **RabbitMQ** - Enterprise messaging queue

### Supporting Technologies
- TypeORM - ORM for PostgreSQL
- ioredis - Redis client
- NestJS Test Utilities - Testing framework
- Bruno - API testing (for REST + GraphQL)

## Directory Structure

```
/src
├── config/
│   ├── database.ts          # PostgreSQL configuration
│   ├── redis.ts             # Redis configuration
│   └── messaging.ts         # Message queue configuration
├── infrastructure/
│   ├── database/
│   │   ├── user.repository.ts
│   │   ├── order.repository.ts
│   │   └── payment.repository.ts
│   ├── cache/
│   │   ├── redis.service.ts
│   │   └── cache.keys.ts
│   └── messaging/
│       ├── nats.service.ts
│       └── rabbitmq.service.ts
├── modules/
│   ├── user/
│   │   ├── user.module.ts
│   │   ├── user.service.ts
│   │   ├── user.controller.ts
│   │   └── user.types.ts
│   ├── order/
│   ├── payment/
│   └── auth/
├── common/
│   ├── exceptions.ts
│   ├── dtos.ts
│   ├── types.ts
│   └── utils.ts
└── main.ts                  # Application bootstrap
```

## Module Architecture

### 1. Domain Modules

#### User Module
```typescript
// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
```

#### Order Module
```typescript
// src/order/order.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
})
export class OrderModule {}
```

### 2. Cross-Cutting Concerns

#### Database Configuration
```typescript
// src/config/database.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const config: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Order, Payment, AuditLog, FeatureFlag],
  synchronize: false,
  migrationsRun: true,
  ssl: process.env.NODE_ENV === 'production',
  poolSize: 20,
  cache: {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    },
  },
  logging: process.env.NODE_ENV !== 'production',
};

@Module({
  exports: [TypeOrmModule.forRoot(config)],
})
export class DatabaseModule {}
```

#### Redis Configuration
```typescript
// src/config/redis.ts
import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST'),
          port: parseInt(configService.get('REDIS_PORT')),
          password: configService.get('REDIS_PASSWORD'),
          db: parseInt(configService.get('REDIS_DB')),
          retryStrategy: (times: number) => {
            if (times > 3) throw new Error('Redis connection failed');
            return Math.min(times * 100, 3000);
          },
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
```

#### Message Queue Configuration
```typescript
// src/config/messaging.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [
            `nats://${process.env.NATS_HOST}:${process.env.NATS_PORT}`,
            `nats://localhost:${process.env.NATS_BACKUP_PORT}`,
          ],
        },
      },
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RABBITMQ,
        options: {
          urls: [
            `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@${process.env.RABBITMQ_HOST}`,
          ],
          queue: 'api_processing_queue',
          queueOptions: { durable: true },
          exchange: 'api_exchange',
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MessagingModule {}
```

### 3. Application Services

#### Base Service
```typescript
// src/common/services/base.service.ts
import { Repository } from 'typeorm';

export abstract class BaseService<T> {
  constructor(protected repository: Repository<T>) {}

  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  async findById(id: any): Promise<T> {
    return this.repository.findOneOrFail({ where: { id } as any });
  }

  async create(data: Partial<T>): Promise<T> {
    const entity = this.repository.create(data as any);
    return this.repository.save(entity);
  }

  async update(id: any, data: Partial<T>): Promise<T> {
    await this.findById(id);
    await this.repository.update(id, data as any);
    return this.findById(id);
  }

  async delete(id: any): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
  }
}
```

#### User Service
```typescript
// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { BaseService } from '../common/services/base.service';

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super(userRepository);
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOneOrFail({ where: { email } });
  }

  async validateUser(email: string, passwordHash: string): Promise<User> {
    const user = await this.findByEmail(email);
    // Password validation logic here
    return user;
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // Business logic here
    const hashedPassword = await this.hashPassword(createUserDto.password);
    const user = this.userRepository.create({
      ...createUserDto,
      passwordHash: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  private async hashPassword(password: string): Promise<string> {
    // Password hashing logic
    return password; // Placeholder
  }
}
```

#### Order Service
```typescript
// src/order/order.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { BaseService } from '../common/services/base.service';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';

@Injectable()
export class OrderService extends BaseService<Order> {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private userService: UserService,
  ) {
    super(orderRepository);
  }

  async createOrder(userId: string, orderData: CreateOrderDto): Promise<Order> {
    const user = await this.userService.findById(userId);
    
    const order = this.orderRepository.create({
      user,
      items: orderData.items,
      total: this.calculateTotal(orderData.items),
      status: OrderStatus.PENDING,
    });
    
    return this.orderRepository.save(order);
  }

  private calculateTotal(items: OrderItemDto[]): number {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.findById(orderId);
    order.status = status;
    return this.orderRepository.save(order);
  }
}
```

## Infrastructure Services

### Redis Service
```typescript
// src/infrastructure/cache/redis.service.ts
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(private readonly redis: Redis) {}

  // Session management
  async setSession(userId: string, sessionData: SessionData, ttl: number): Promise<void> {
    await this.redis.setex(
      `sessions:${userId}`, 
      ttl, 
      JSON.stringify(sessionData)
    );
  }

  async getSession(userId: string): Promise<SessionData | null> {
    const data = await this.redis.get(`sessions:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  // User profile cache
  async cacheUser(userId: string, userData: any, ttl: number): Promise<void> {
    await this.redis.setex(`users:${userId}`, ttl, JSON.stringify(userData));
  }

  async getCachedUser(userId: string): Promise<any | null> {
    const data = await this.redis.get(`users:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await this.redis.incr(`rate_limit:${key}:${window}`);
    if (current === 1) {
      await this.redis.expire(`rate_limit:${key}:${window}`, window);
    }
    return current <= limit;
  }

  // Feature flags
  async getFeatureFlag(name: string): Promise<FeatureFlagConfig | null> {
    const data = await this.redis.get(`features:${name}`);
    return data ? JSON.parse(data) : null;
  }

  // Invalidation
  async invalidateUser(userId: string): Promise<void> {
    await this.redis.del(`users:${userId}`, `sessions:${userId}`);
  }
}
```

### Message Queue Services
```typescript
// src/infrastructure/messaging/nats.service.ts
import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/core';

@Injectable()
export class NatsService {
  constructor(
    @Inject('NATS_SERVICE')
    private natsClient: ClientProxy,
  ) {}

  async emit(event: string, data: any): Promise<void> {
    await this.natsClient.emit(event, data);
  }

  async request(pattern: string, data: any): Promise<any> {
    return this.natsClient.send(pattern, data);
  }
}
```

```typescript
// src/infrastructure/messaging/rabbitmq.service.ts
import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/core';

@Injectable()
export class RabbitMQService {
  constructor(
    @Inject('RABBITMQ_SERVICE')
    private rabbitmqClient: ClientProxy,
  ) {}

  async send(pattern: string, data: any): Promise<any> {
    return this.rabbitmqClient.send(pattern, data);
  }

  async emit(event: string, data: any): Promise<void> {
    await this.rabbitmqClient.emit(event, data);
  }
}
```

## API Testing with Bruno

### API Structure
```typescript
// src/user/user.controller.ts
import { Controller, Get, Post, Body, Param, Inject } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { NatsService } from '../infrastructure/messaging/nats.service';

@Controller('api/users')
export class UserController {
  constructor(
    private userService: UserService,
    private natsService: NatsService,
  ) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.createUser(createUserDto);
    await this.natsService.emit('user.created', user);
    return user;
  }

  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}
```

### Bruno Test Collections

#### REST API Tests
```json
// bruno/collections/rest-api/users.bruno
{
  "name": "Users API",
  "method": "GET",
  "url": "{{baseUrl}}/api/users",
  "headers": {
    "Authorization": "Bearer {{token}}",
    "Content-Type": "application/json"
  },
  "tests": [
    "pm.response.status === 200",
    "pm.response.json().length > 0",
    "pm.expect(pm.response.json()[0].id).to.be.a('number')"
  ]
}
```

#### GraphQL Tests
```graphql
// bruno/collections/graphql/users.graphqls
query GetUsers($limit: Int, $offset: Int) {
  users(limit: $limit, offset: $offset) {
    id
    username
    email
    createdAt
    updatedAt
  }
}
```

#### Bruno Environment Config
```json
// bruno/environments/development.brunoenv
{
  "baseUrl": "http://localhost:3000",
  "graphqlUrl": "http://localhost:3000/graphql",
  "apiKey": ""
}
```

### Test Automation Script
```bash
#!/bin/bash
# test-apis.sh

# Run API tests using Bruno

# Install Bruno if not present
if ! command -v bruno &> /dev/null; then
  echo "Installing Bruno..."
  npm install -g @usebruno/cli
fi

# Run REST API tests

echo "🚀 Running REST API Tests..."
bruno run ./test-files/bruno/collections/rest-api --env development

# Run GraphQL tests

echo "🚀 Running GraphQL Tests..."
bruno run ./test-files/bruno/collections/graphql --env development

echo "✅ All API tests completed successfully!"
```

## Database Models

### PostgreSQL Entities
```typescript
// src/user/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: true })
  isActive: boolean;
}
```

### Database Schema
```sql
-- PostgreSQL Configuration
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_users_email_unique ON users(email);

-- Feature Flags Table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  value JSONB NOT NULL,
  target_audience JSONB,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_flags_name_status ON feature_flags(name, is_active);
```

## Deployment Configuration

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "${DB_PORT}:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "${REDIS_PORT}:6379"

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    ports:
      - "${RABBITMQ_PORT}:5672"
      - "${RABBITMQ_MANAGEMENT_PORT}:15672"

  app:
    build: .
    depends_on:
      - postgres
      - redis
      - rabbitmq
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USER: ${RABBITMQ_USER}
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD}
    ports:
      - "${APP_PORT}:3000"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
```

### Environment Variables
```bash
# .env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=modular_monolith
DB_USER=app_user
DB_PASSWORD=secure_password_here

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_here
REDIS_DB=0

# Message Queues
NATS_HOST=nats
NATS_PORT=4222
NATS_BACKUP_PORT=4222
NATS_USER=nats
NATS_PASSWORD=nats_password_here

RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# Application
APP_PORT=3000
NODE_ENV=development
```

## Performance Optimization

### Database Optimization
```sql
-- PostgreSQL performance settings
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '2GB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
SELECT pg_reload_conf();
```

### Redis Optimization
```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Query Optimization
```sql
-- Critical indexes
CREATE INDEX idx_users_email_unique ON users(email) WHERE is_active = TRUE;
CREATE INDEX idx_feature_flags_name_status ON feature_flags(name, is_active);
CREATE INDEX idx_sessions_user_id_expires ON user_sessions(user_id, expires_at);
```

## Monitoring & Observability

### Database Metrics
```sql
-- PostgreSQL stats
SELECT 
  psd.datname as database,
  psu.userid as user,
  psu.query,
  psu.total_time / psu.calls as avg_time,
  psu.calls,
  now() - psu.query_start as duration
FROM pg_stat_activity psu
JOIN pg_stat_database psd ON psu.datid = psd.oid
WHERE psu.query NOT LIKE '%pg_stat%'
  AND psd.datname = current_database()
ORDER BY psu.total_time DESC
LIMIT 10;
```

### Redis Metrics
```bash
# Redis monitoring
redis-cli --latency
redis-cli info memory
redis-cli info stats
redis-cli info persistence
```

### Message Queue Metrics
```bash
# NATS metrics
nats --server nats://localhost:4222 monitor
nats --server nats://localhost:4222 stats

# RabbitMQ metrics
rabbitmqctl list_queues name messages consumers
rabbitmqctl overview
rabbitmqctl stats
```

## Testing Strategy

### Unit Tests
```typescript
// src/user/user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { User } from './user.entity';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useClass: jest.fn().mockImplementation(() => ({ 
            findOneOrFail: jest.fn().mockResolvedValue(new User()),
          })),
        },
      ],
    }).compile();

    service = module.get(UserService);
    repository = module.get(UserRepository);
  });

  it('should create a user', async () => {
    const createUserDto = { email: 'test@example.com', password: 'password' };
    const result = await service.createUser(createUserDto);
    expect(result).toBeDefined();
  });
});
```

### Integration Tests
```typescript
// test/e2e/rest-api.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as bruno from '@usebruno/cli';

describe('Users API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3000);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should test users API with Bruno', async () => {
    const brunoConfig = {
      collectionPath: './test-files/bruno/collections/rest-api',
      environment: 'development',
      variables: {
        baseUrl: `http://localhost:${await app.getHttpServer().address().port}`,
        token: 'test-token-123',
      },
    };

    const results = await bruno.runTests(brunoConfig);
    
    expect(results.failedTests).toBe(0);
    expect(results.passedTests).toBeGreaterThan(0);
  });
});
```

## Error Handling

### Global Exception Handler
```typescript
// src/common/exceptions/global-exception.filter.ts
import { Catch, ExceptionFilter, HttpException, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : 500;

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message: exception.message || 'Internal server error',
      });
  }
}
```

### Application Module
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { AuthModule } from './auth/auth.module';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(),
    UserModule,
    OrderModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

## Conclusion

The modular monolith pattern with NestJS provides a robust foundation for building scalable applications that balance developer productivity with operational efficiency. By leveraging PostgreSQL for data persistence, Redis for caching and session management, and multiple message queues for asynchronous communication, this architecture supports high-performance requirements while maintaining simplicity and maintainability.

Key advantages include:
- Single codebase for easier development and deployment
- Internal modularity for technical scalability
- Strong data consistency with ACID compliance
- Comprehensive testing capabilities with Bruno
- Optimized performance with caching and message queues
- Observable and monitorable architecture

This pattern is particularly well-suited for teams that need to scale their applications without the operational complexity of distributed systems, while still achieving the performance and flexibility required by modern applications.
