import {
    ById,
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types';

export type CouchDBCheckpointType = {
    sequence: number;
};

export enum CouchDBFilterType {
    ClassicFilter = 1,
    ViewFilter
} 
export type CouchDBFilterOptions = {
    filterType: CouchDBFilterType;
    designDoc: string;
    viewName: string;
    queryParams?: Map<string, any>;
}

export type FetchMethodType = typeof fetch;
export type SyncOptionsCouchDBNew<RxDocType> = Omit<
ReplicationOptions<RxDocType, any>,
'pull' | 'push' | 'replicationIdentifier' | 'collection'
> & {
    url: string;
    /**
     * Here you can set a custom fetch method
     * to use http headers or credentials when doing requests.
     */
    fetch?: FetchMethodType;
    pull?: Omit<ReplicationPullOptions<RxDocType, CouchDBCheckpointType>, 'handler' | 'stream$'> & {
        /**
         * Heartbeat time in milliseconds
         * for the long polling of the changestream.
         */
        heartbeat?: number;

        filter?: CouchDBFilterOptions;
    };
    push?: Omit<ReplicationPushOptions<RxDocType>, 'handler'>;
};


export type URLQueryParams = ById<string | number | undefined | boolean>;
