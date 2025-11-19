#!/usr/bin/env ts-node

import { Client } from '@opensearch-project/opensearch';

interface OpenSearchConfig {
  node: string;
  username: string;
  password: string;
  index: string;
}

// Index template for proper log structure
const indexTemplate = {
  index_patterns: ["knowted-logs-*"],
  template: {
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1,
      "index.refresh_interval": "5s"
    },
    mappings: {
      properties: {
        "@timestamp": { type: "date" },
        level: { type: "keyword" },
        time: { type: "long" },
        pid: { type: "integer" },
        hostname: { type: "keyword" },
        msg: { type: "text", analyzer: "standard" },
        context: { type: "keyword" },
        userId: { type: "keyword" },
        organizationId: { type: "keyword" },
        requestId: { type: "keyword" },
        req: {
          properties: {
            id: { type: "integer" },
            method: { type: "keyword" },
            url: { type: "keyword" },
            query: { type: "object" },
            params: { type: "object" },
            headers: { type: "object" },
            remoteAddress: { type: "ip" },
            remotePort: { type: "integer" }
          }
        },
        res: {
          properties: {
            statusCode: { type: "integer" },
            responseTime: { type: "integer" }
          }
        },
        err: {
          properties: {
            type: { type: "keyword" },
            message: { type: "text" },
            stack: { type: "text" }
          }
        },
        businessEvent: { type: "keyword" },
        authEvent: { type: "keyword" },
        paymentEvent: { type: "keyword" },
        securityEvent: { type: "keyword" },
        performanceEvent: { type: "keyword" },
        duration: { type: "integer" },
        severity: { type: "keyword" }
      }
    }
  }
};



async function setupOpenSearch() {
  const config: OpenSearchConfig = {
    node: process.env.OPENSEARCH_NODE || 'https://localhost:9200',
    username: process.env.OPENSEARCH_USERNAME || 'admin',
    password: process.env.OPENSEARCH_PASSWORD || 'admin',
    index: process.env.OPENSEARCH_INDEX || 'knowted-logs',
  };

  console.log('🔧 OpenSearch Configuration:');
  console.log(`   Node: ${config.node}`);
  console.log(`   Username: ${config.username}`);
  console.log(`   Index: ${config.index}`);
  console.log('');

  const client = new Client({
    node: config.node,
    auth: {
      username: config.username,
      password: config.password,
    },
    ssl: {
      rejectUnauthorized: false, // For self-signed certificates
    },
  });

  try {
    console.log('🔍 Testing OpenSearch connection...');
    const health = await client.cluster.health();
    console.log('✅ OpenSearch connection successful:', health.body.status);

    // Skip lifecycle policy for now (DigitalOcean OpenSearch compatibility)
    console.log('⏭️  Skipping lifecycle policy (DigitalOcean OpenSearch compatibility)');

    // Create index template
    console.log('📋 Creating index template...');
    await client.indices.putIndexTemplate({
      name: 'knowted-logs-template',
      body: indexTemplate as any,
    });
    console.log('✅ Index template created');

    // Create initial index with explicit mapping
    console.log('📋 Creating initial index with proper mapping...');
    try {
      await client.indices.create({
        index: config.index,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
            "index.refresh_interval": "5s"
          },
          mappings: {
            properties: {
              "@timestamp": { type: "date" },
              level: { type: "keyword" },
              time: { type: "long" },
              pid: { type: "integer" },
              hostname: { type: "keyword" },
              msg: { type: "text", analyzer: "standard" },
              context: { type: "keyword" },
              userId: { type: "keyword" },
              organizationId: { type: "keyword" },
              requestId: { type: "keyword" },
              req: {
                properties: {
                  id: { type: "integer" },
                  method: { type: "keyword" },
                  url: { type: "keyword" },
                  query: { type: "object" },
                  params: { type: "object" },
                  headers: { type: "object" },
                  remoteAddress: { type: "ip" },
                  remotePort: { type: "integer" }
                }
              },
              res: {
                properties: {
                  statusCode: { type: "integer" },
                  responseTime: { type: "integer" }
                }
              },
              err: {
                properties: {
                  type: { type: "keyword" },
                  message: { type: "text" },
                  stack: { type: "text" }
                }
              },
              businessEvent: { type: "keyword" },
              authEvent: { type: "keyword" },
              paymentEvent: { type: "keyword" },
              securityEvent: { type: "keyword" },
              performanceEvent: { type: "keyword" },
              duration: { type: "integer" },
              severity: { type: "keyword" }
            }
          }
        },
      });
      console.log('✅ Initial index created with proper mapping');
    } catch (error: any) {
      if (error.body?.error?.type === 'resource_already_exists_exception') {
        console.log('ℹ️  Index already exists, skipping creation');
      } else {
        throw error;
      }
    }

    // Test logging a sample document
    console.log('🧪 Testing log ingestion...');
    const testLog = {
      "@timestamp": new Date().toISOString(),
      level: "info",
      msg: "OpenSearch setup test log",
      context: "OpenSearchSetup",
      userId: "test-user",
      organizationId: "test-org",
      requestId: "test-request-123"
    };

    await client.index({
      index: config.index,
      body: testLog,
    });
    console.log('✅ Test log ingested successfully');

    // Wait a moment for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the log was indexed
    const searchResult = await client.search({
      index: config.index,
      body: {
        query: {
          term: {
            requestId: "test-request-123"
          }
        }
      }
    });

    if ((searchResult.body.hits.total as any).value > 0) {
      console.log('✅ Test log found in search results');
      console.log('📊 Sample log structure:', JSON.stringify(searchResult.body.hits.hits[0]._source, null, 2));
    } else {
      console.log('⚠️  Test log not found in search results (may need more time to index)');
    }

    console.log('');
    console.log('🎉 OpenSearch setup completed successfully!');
    console.log(`📊 Logs will be indexed to: ${config.index}`);
    console.log('📈 Dashboard available at:', config.node.replace(':9200', ':5601'));
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Set OPENSEARCH_ENABLED=true in your production environment');
    console.log('   2. Deploy your application');
    console.log('   3. Your logs will now go directly to OpenSearch!');

  } catch (error) {
    console.error('❌ OpenSearch setup failed:', error);
    if (error.body) {
      console.error('Error details:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

if (require.main === module) {
  setupOpenSearch();
}
