import {
    QUERY_INPUT_CHANGE,
    SUGGESTIONS_HIDE,
    SUGGESTIONS_USE
} from '../actions';

import { findNearestQuerySeparator } from '../utils';

const _emptyState = () => {
    return {'items': [], 'separatorIndex': -1};
};

const _ifNotOneExactMatchToInput = (input, suggestionsState) => {
    if (suggestionsState.items.length == 1 && input == suggestionsState.items[0]) {
        // there is no reason to suggest something that's already been fully typed in
        return _emptyState();
    } else {
        return suggestionsState;
    }
};

const suggestionsReducer = (suggestionsState = {'items': [], 'separatorIndex': -1}, suggestionSourceState = [], action) => {

    switch (action.type) {
        case SUGGESTIONS_HIDE:
        case SUGGESTIONS_USE:
            return _emptyState();

        case QUERY_INPUT_CHANGE:
            const {query, cursorPosition} = action;

            const separatorLeft = findNearestQuerySeparator(query, cursorPosition, 'left');
            const separatorRight = findNearestQuerySeparator(query, cursorPosition, 'right');

            // sanity check
            if (separatorLeft.separator == ';'
                && (query.indexOf('.') == -1 || query.indexOf('.') > separatorLeft.offset)) {
                // incorrect query -- you can use ';' to add filtering by another column
                // after one filter has been applied with "table.column=value" syntax
                return _emptyState();
            }

            if (separatorLeft.separator === null) {

                const inputtedTableName = query.slice(0, separatorRight.offset || query.length);
                if (!inputtedTableName.length) {
                    return _emptyState();
                }
                const matchedTableNames = Object.keys(suggestionSourceState).filter(
                    tablename => tablename.indexOf(query) === 0
                );
                return _ifNotOneExactMatchToInput(
                    inputtedTableName,
                    {items: matchedTableNames, separatorIndex: -1}
                );

            } else if (separatorLeft.separator == '.' || separatorLeft.separator == ';') {

                const inputtedColumnName = query.slice(separatorLeft.offset + 1, separatorRight.offset || query.length);

                const inputtedTable = query.split('.')[0];
                const suggestionSourceForInputtedTable = suggestionSourceState[inputtedTable];
                if (typeof suggestionSourceForInputtedTable == 'undefined') {
                    return _emptyState();
                }

                let matchedColumnNames = [];
                let separatorIndex = -1;
                ['indexed', 'nonindexed'].forEach(columnType => {

                    if (!suggestionSourceForInputtedTable[columnType + '_columns'].length) {
                        return;
                    }

                    matchedColumnNames = [
                        ...matchedColumnNames,
                        ...suggestionSourceForInputtedTable[columnType + '_columns'].filter(
                            columnname => columnname.indexOf(inputtedColumnName) === 0
                        )
                    ];
                    if (columnType == 'indexed' && matchedColumnNames.length) {
                        // separator between indexed and non-indexed columns
                        separatorIndex = (matchedColumnNames.length - 1);
                    }
                });
                if (matchedColumnNames[matchedColumnNames.length - 1] == separatorIndex) {
                    // this would be the case, if all matches are indexed columns
                    // no need to have a separator
                    separatorIndex = -1;
                }
                return _ifNotOneExactMatchToInput(
                    inputtedColumnName,
                    {items: matchedColumnNames, separatorIndex}
                );

            } else {
                return _emptyState();
            }

        default:
            return suggestionsState;
    }
};

export default suggestionsReducer;