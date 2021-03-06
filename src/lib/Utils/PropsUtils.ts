import { AllHTMLAttributes } from 'react';
import { isFunction } from 'util';

import { ITableProps } from '../';
import { Column } from '../models';
import { ChildComponent } from '../Models/ChildComponent';
import { ChildAttributesItem, DispatchFunc } from '../types';
import { filterData, searchData } from './FilterUtils';
import { getGroupedData } from './GroupUtils';
import { getPageData, getPagesCount } from './PagingUtils';
import { sortData } from './SortUtils';
import { convertToColumnTypes } from './TypeUtils';

export const extendProps = (
  childElementAttributes: AllHTMLAttributes<HTMLElement>,
  childProps: any,
  childComponent?: ChildComponent<any>): React.AllHTMLAttributes<HTMLElement> => {
    let resultProps = childElementAttributes;
    const childCustomAttributes = childComponent && childComponent.elementAttributes && childComponent.elementAttributes(childProps);
    if (childCustomAttributes) {
      const dispatch: DispatchFunc = childProps.dispatch;
      resultProps = mergeProps(childElementAttributes, childProps, childCustomAttributes, dispatch);
    }
    return resultProps;
};

const emptyFunc = () => {};
export const mergeProps = (
  childElementAttributes: AllHTMLAttributes<HTMLElement>,
  childProps: any,
  childCustomAttributes: ChildAttributesItem<any>,
  dispatch: DispatchFunc): React.AllHTMLAttributes<HTMLElement> => {
  const customPropsWithEvents: any = {};
  for (const prop in childCustomAttributes) {
    if (childCustomAttributes.hasOwnProperty(prop)) {
      const propName = prop as string;
      const propValue: any = (childCustomAttributes as any)[propName];
      const baseFunc = (childElementAttributes as any)[propName] || emptyFunc;
      if (isFunction(propValue)) {
        customPropsWithEvents[prop] = (e: any) => {
          propValue(e, {
            baseFunc,
            childElementAttributes,
            childProps,
            dispatch,
          });
        };
      }
    }
  }
  const mergedResult: React.AllHTMLAttributes<HTMLDivElement> = {
    ...childElementAttributes,
    ...childCustomAttributes,
    ...customPropsWithEvents,
    className: `${childElementAttributes.className || ''} ${childCustomAttributes.className || ''}`,
    style: { ...childCustomAttributes.style, ...childElementAttributes.style }
  };

  return mergedResult;
};

const _filterData = (props: ITableProps) => {
  const {
    extendedFilter,
    columns,
    searchText,
    search,
  } = props;
  let {
    data = [],
  } = props;
  data = [...data];
  data = extendedFilter ? extendedFilter(data) : data;
  data = searchText ? searchData(columns, data, searchText, search) : data;
  data = convertToColumnTypes(data, columns);
  data = filterData(data, columns);

  return data;
};

export const getData = (props: ITableProps) => {
  const {
    columns,
    groups,
    groupsExpanded,
    paging,
  } = props;
  let {
    data = [],
  } = props;
  data = [...data];
  data = _filterData(props);
  data = sortData(columns, data);

  const groupedColumns: Column[] = groups ? columns.filter((c) => groups.some((g) => g.columnKey === c.key)) : [];
  const groupedData = groups ? getGroupedData(data, groups, groupedColumns, groupsExpanded) : data;
  data = getPageData(groupedData, paging);

  return data;
};

export const prepareTableOptions = (props: ITableProps) => {
  const {
    groups,
    paging,
  } = props;
  let {
    columns,
  } = props;
  const groupedData = getData(props);
  let groupColumnsCount = 0;
  let groupedColumns: Column[] = [];
  if (groups) {
    groupColumnsCount = groups.length;
    groupedColumns = columns.filter((c) => groups.some((g) => g.columnKey === c.key));
    columns = columns.filter((c) => !groups.some((g) => g.columnKey === c.key));
  }
  let pagesCount = 1;
  if (paging && paging.enabled) {
    pagesCount = getPagesCount(_filterData(props), paging);
  }
  return {
    columns,
    groupColumnsCount,
    groupedColumns,
    groupedData,
    pagesCount
  };
};

export const getDraggableProps = (
  key: any,
  dispatch: DispatchFunc,
  actionCreator: (draggableKeyValue: any, targetKeyValue: any) => any,
  draggedClass: string,
  dragOverClass: string,
): ChildAttributesItem<any> => {
  let count: number = 0;
  return {
    draggable: true,
    onDragStart: (event) => {
      count = 0;
      event.dataTransfer.setData('ka-draggableKeyValue', JSON.stringify(key));
      event.currentTarget.classList.add(draggedClass);
      event.dataTransfer.effectAllowed = 'move';
    },
    onDragEnd: (event) => {
      event.currentTarget.classList.remove(draggedClass);
    },
    onDrop: (event) => {
      event.currentTarget.classList.remove(dragOverClass);
      const draggableKeyValue = JSON.parse(event.dataTransfer.getData('ka-draggableKeyValue'));
      dispatch(actionCreator(draggableKeyValue, key));
    },
    onDragEnter: (event) => {
      count++;
      if (!event.currentTarget.classList.contains(dragOverClass)){
        event.currentTarget.classList.add(dragOverClass);
      }
      event.preventDefault();
    },
    onDragLeave: (event) => {
      count--;
      if (count === 0){
        event.currentTarget.classList.remove(dragOverClass);
      }
    },
    onDragOver: (event) => {
      if (!event.currentTarget.classList.contains(dragOverClass)){
        event.currentTarget.classList.add(dragOverClass);
      }
      event.preventDefault();
    }
  };
}
