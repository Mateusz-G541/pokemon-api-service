import { InfluxDB, Point } from '@influxdata/influxdb-client';

export class MetricsService {
  private influxDB: InfluxDB;
  private writeApi: any;

  constructor() {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const database = process.env.INFLUXDB_DATABASE || 'k6';

    // For InfluxDB 1.8, we don't need token/org, just URL and database
    this.influxDB = new InfluxDB({ url });
    this.writeApi = this.influxDB.getWriteApi('', database, 'ns');
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, path: string, statusCode: number, responseTime: number) {
    const point = new Point('http_requests')
      .tag('method', method)
      .tag('path', path)
      .tag('status_code', statusCode.toString())
      .floatField('response_time', responseTime)
      .intField('count', 1);

    this.writeApi.writePoint(point);
  }

  /**
   * Record application metrics
   */
  recordAppMetric(name: string, value: number, tags: Record<string, string> = {}) {
    const point = new Point('app_metrics')
      .tag('metric_name', name);

    Object.entries(tags).forEach(([key, val]) => {
      point.tag(key, val);
    });

    point.floatField('value', value);
    this.writeApi.writePoint(point);
  }

  /**
   * Record Pokemon data access metrics
   */
  recordPokemonAccess(identifier: string | number) {
    const pokemonId = typeof identifier === 'number' ? identifier : 0;
    const operation = typeof identifier === 'string' ? 'by_name' : 'by_id';

    const point = new Point('pokemon_access')
      .tag('operation', operation)
      .intField('pokemon_id', pokemonId)
      .intField('count', 1);

    this.writeApi.writePoint(point);
  }

  /**
   * Record search operations
   */
  recordSearch(query: string, resultCount: number) {
    const point = new Point('search_operations')
      .tag('query', query.substring(0, 50)) // Limit query length
      .intField('result_count', resultCount)
      .intField('count', 1);

    this.writeApi.writePoint(point);
  }

  /**
   * Record suggestion operations
   */
  recordSuggestions(query: string, suggestionCount: number) {
    const point = new Point('suggestion_operations')
      .tag('query', query.substring(0, 50)) // Limit query length
      .intField('suggestion_count', suggestionCount)
      .intField('count', 1);

    this.writeApi.writePoint(point);
  }

  /**
   * Record list operations
   */
  recordListAccess(offset: number, limit: number, returnedCount: number) {
    const point = new Point('list_operations')
      .intField('offset', offset)
      .intField('limit', limit)
      .intField('list_count', returnedCount)
      .intField('count', 1);

    this.writeApi.writePoint(point);
  }

  /**
   * Flush metrics to InfluxDB
   */
  async flush() {
    try {
      await this.writeApi.flush();
    } catch (error) {
      console.error('Error flushing metrics to InfluxDB:', error);
    }
  }

  /**
   * Close the connection
   */
  async close() {
    try {
      await this.writeApi.close();
    } catch (error) {
      console.error('Error closing InfluxDB connection:', error);
    }
  }
}

/**
 * Middleware function to record HTTP request metrics
 */
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const metricsService = new MetricsService();

      metricsService.recordHttpRequest(
        req.method,
        req.path,
        res.statusCode,
        responseTime
      );
    });

    next();
  };
}