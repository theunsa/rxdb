import { WithDeleted } from '../../types';
import { pouchSwapIdToPrimary } from '../pouchdb';
import {
    CouchDBFilterOptions,
    URLQueryParams,
    CouchDBFilterType
} from './couchdb-types';


export const COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-couchdb-';


export function mergeUrlQueryParams(
    params: URLQueryParams
): string {
    return Object.entries(params)
        .filter(([_k, value]) => typeof value !== 'undefined')
        .map(([key, value]) => key + '=' + value)
        .join('&');
}

export function couchDBDocToRxDocData<RxDocType>(
    primaryPath: string,
    couchDocData: any
): WithDeleted<RxDocType> {
    const doc = pouchSwapIdToPrimary(primaryPath, couchDocData);

    // ensure deleted flag is set.
    doc._deleted = !!doc._deleted;

    return doc;
}

export function couchDBFilterOptionsToQueryString(
    options: CouchDBFilterOptions
): string {
    /**
     * @link https://docs.couchdb.org/en/3.2.2-docs/ddocs/ddocs.html#filter-functions
     */
    let filterQueryString = ''
    if (options.filterType && options.filterType === CouchDBFilterType.ViewFilter) {
        filterQueryString = `filter=_view&view=${options.designDoc}/${options.viewName}`
    } else {
        filterQueryString = `filter=${options.designDoc}/${options.viewName}`
        if (options.queryParams) {
            filterQueryString += Object.entries(options.queryParams)
                .join('&')
                .replaceAll(',', '=')
        }
    }
    return filterQueryString 
}
