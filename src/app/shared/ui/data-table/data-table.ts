import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  SimpleChanges,
  OnChanges,
} from '@angular/core';
import {
  DataTableActionEvent,
  DataTableColumn,
  DataTableFileTypeIconClickEvent,
  DataTableInlineIcon,
  DataTableRowAction,
  DataTableSearchEvent,
  DataTableSelectionChangeEvent,
  DataTableToolbarActionEvent,
  DataTableToolbarActionId,
} from './table.types';
import { getFileExtension, getFileTypeIconPath } from '../../utils/file-type-icon.util';
import { Icon } from '../icon/icon';
import { Dropdown } from '../dropdown/dropdown/dropdown';
import { Item } from '../dropdown/item/item';
import { Checkbox } from '../../components/form/input/checkbox';
import { formatSentenceValue } from '../../utils/normalized-text.util';

@Component({
  selector: 'app-data-table',
  standalone: true,
  templateUrl: './data-table.html',
  imports: [Icon, Dropdown, Item, Checkbox],
})
export class DataTable<T = unknown> implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('sentinelElement') sentinelElement?: ElementRef<HTMLDivElement>;
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;
  @Input() columns: DataTableColumn<T>[] = [];
  @Input() rows: T[] = [];
  @Input() rowActions: DataTableRowAction<T>[] = [];
  @Input() inlineIcons: DataTableInlineIcon<T>[] = [];
  @Input() emptyMessage = 'No hay registros para mostrar.';
  @Input() rowIdentity: (row: T, index: number) => string | number = (_row, index) => index;
  @Input() showToolbar = true;
  @Input() showRefreshButton = true;
  @Input() showDeleteButton = true;
  @Input() showAddButton = true;
  @Input() showSearchInput = true;
  @Input() searchPlaceholder = 'Buscar...';
  @Input() searchPredicate?: (row: T, term: string) => boolean;
  @Input() useFixedLayout = false;
  @Input() wrapCellText = false;

  @Input() enableSelection = false;
  @Input() enableBulkActions = false;
  @Input() selectedRowKeys: Array<string | number> = [];
  @Input() selectedIds: string[] = [];

  //Scroll infinito: LP: 30-004-2026
  @Input() enableInfiniteScroll = false;
  @Input() blockSize = 10;
  @Input() isLoadingMore = false;
  @Input() tableMaxHeight = '600px';
  @Input() hasMore = true;
  @Input() endOfListMessage = 'Has llegado al final de la lista.';

  @Output() rowAction = new EventEmitter<DataTableActionEvent<T>>();
  @Output() toolbarAction = new EventEmitter<DataTableToolbarActionEvent<T>>();
  @Output() searchChange = new EventEmitter<DataTableSearchEvent<T>>();
  @Output() selectedRowKeysChange = new EventEmitter<Array<string | number>>();
  @Output() selectedIdsChange = new EventEmitter<string[]>();
  @Output() selectionChange = new EventEmitter<DataTableSelectionChangeEvent<T>>();
  @Output() fileTypeIconClick = new EventEmitter<DataTableFileTypeIconClickEvent<T>>();

  //Scroll infinito: LP: 30-004-2026
  @Output() loadMore = new EventEmitter<{ blockIndex: number; offset: number }>();

  activeRowMenuKey: string | number | null = null;
  searchTerm = '';

  //Scroll infinito: LP: 30-004-2026
  private intersectionObserver: IntersectionObserver | null = null;
  private currentBlockIndex = 0;
  private scrollListener: (() => void) | null = null;
  private isLoadMorePending = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['isLoadingMore'] &&
      changes['isLoadingMore'].previousValue === true &&
      changes['isLoadingMore'].currentValue === false
    ) {
      this.isLoadMorePending = false;
    }
  }

  resolveCell(column: DataTableColumn<T>, row: T): string {
    const rawValue = column.cell(row);
    return this.formatCellValue(rawValue, column);
  }

  fileTypeIconPath(column: DataTableColumn<T>, row: T): string {
    return getFileTypeIconPath(String(column.cell(row) ?? ''));
  }

  fileTypeIconAltText(column: DataTableColumn<T>, row: T): string {
    return `Tipo de archivo ${getFileExtension(String(column.cell(row) ?? ''))}`;
  }

  onFileTypeIconAction(column: DataTableColumn<T>, row: T, rowIndex: number): void {
    this.fileTypeIconClick.emit({
      row,
      columnId: column.id,
      fileName: String(column.cell(row) ?? '').trim() || 'documento',
      rowKey: this.resolveFilteredRowKey(row, rowIndex),
      rowIndex,
    });
  }

  isActionVisible(action: DataTableRowAction<T>, row: T): boolean {
    return action.visible ? action.visible(row) : true;
  }

  isInlineIconVisible(icon: DataTableInlineIcon<T>, row: T): boolean {
    return icon.visible ? icon.visible(row) : true;
  }

  emitRowAction(actionId: string, row: T, rowIndex: number): void {
    this.rowAction.emit({
      actionId,
      row,
      rowIndex,
      rowKey: this.resolveFilteredRowKey(row, rowIndex),
    });
  }

  resolveRowKey(row: T, index: number): string | number {
    return this.rowIdentity(row, index);
  }

  resolveFilteredRowKey(row: T, filteredIndex: number): string | number {
    return this.resolveRowKey(row, this.resolveSourceIndex(row, filteredIndex));
  }

  isRowMenuOpen(rowKey: string | number): boolean {
    return this.activeRowMenuKey === rowKey;
  }

  toggleRowMenu(rowKey: string | number): void {
    console.log('toggleRowMenu clicked for rowKey:', rowKey);
    console.log('Current activeRowMenuKey:', this.activeRowMenuKey);
    this.activeRowMenuKey = this.activeRowMenuKey === rowKey ? null : rowKey;
    console.log('New activeRowMenuKey:', this.activeRowMenuKey);
  }

  closeRowMenu(rowKey?: string | number): void {
    console.log('closeRowMenu called with:', rowKey);
    if (rowKey === undefined || this.activeRowMenuKey === rowKey) {
      this.activeRowMenuKey = null;
      console.log('Row menu closed.');
    }
  }

  onToolbarAction(actionId: DataTableToolbarActionId): void {
    this.toolbarAction.emit({
      actionId,
      rows: this.filteredRows(),
      selectedRows: this.getSelectedRows(),
      selectedRowKeys: [...this.selectedRowKeys],
      selectedIds: this.selectedIds,
      searchTerm: this.normalizedSearchTerm,
    });
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm = input?.value ?? '';
    this.emitSearchChange();
  }

  filteredRows(): T[] {
    const searchTerm = this.normalizedSearchTerm;
    if (!searchTerm) {
      return this.rows;
    }

    return this.rows.filter((row) => this.matchesSearch(row, searchTerm));
  }

  canDelete(): boolean {
    if (this.enableSelection) {
      return this.selectedRowKeys.length > 0;
    }

    return this.filteredRows().length > 0;
  }

  isRowSelected(row: T, filteredIndex: number): boolean {
    const rowKey = this.resolveFilteredRowKey(row, filteredIndex);
    return this.selectedRowKeys.includes(rowKey);
  }

  areAllVisibleRowsSelected(): boolean {
    const visibleRows = this.filteredRows();

    if (!visibleRows.length) {
      return false;
    }

    return visibleRows.every((row, index) =>
      this.selectedRowKeys.includes(this.resolveFilteredRowKey(row, index)),
    );
  }

  onToggleRowSelection(row: T, filteredIndex: number, checked: boolean): void {
    const rowKey = this.resolveFilteredRowKey(row, filteredIndex);

    const nextKeys = checked
      ? Array.from(new Set([...this.selectedRowKeys, rowKey]))
      : this.selectedRowKeys.filter((key) => key !== rowKey);

    this.updateSelection(nextKeys);
  }

  onToggleAllSelection(checked: boolean): void {
    const visibleKeys = this.filteredRows().map((row, index) =>
      this.resolveFilteredRowKey(row, index),
    );

    const nextKeys = checked
      ? Array.from(new Set([...this.selectedRowKeys, ...visibleKeys]))
      : this.selectedRowKeys.filter((key) => !visibleKeys.includes(key));

    this.updateSelection(nextKeys);
  }

  getSelectedRows(): T[] {
    const selectedKeys = new Set(this.selectedRowKeys);

    return this.rows.filter((row, index) => selectedKeys.has(this.resolveRowKey(row, index)));
  }

  private resolveSourceIndex(row: T, fallbackIndex: number): number {
    const sourceIndex = this.rows.indexOf(row);
    return sourceIndex >= 0 ? sourceIndex : fallbackIndex;
  }

  private updateSelection(nextKeys: Array<string | number>): void {
    this.selectedRowKeys = nextKeys;
    this.selectedIds = nextKeys.map((key) => String(key));
    this.selectedRowKeysChange.emit([...nextKeys]);
    this.selectedIdsChange.emit([...this.selectedIds]);
    this.selectionChange.emit({
      selectedRowKeys: [...nextKeys],
      selectedRows: this.getSelectedRows(),
      allVisibleSelected: this.areAllVisibleRowsSelected(),
    });
  }

  private get normalizedSearchTerm(): string {
    return this.searchTerm.trim().toLowerCase();
  }

  private emitSearchChange(): void {
    this.searchChange.emit({
      searchTerm: this.normalizedSearchTerm,
      rows: this.filteredRows(),
    });
  }

  private matchesSearch(row: T, searchTerm: string): boolean {
    if (this.searchPredicate) {
      return this.searchPredicate(row, searchTerm);
    }

    return this.columns.some((column) =>
      this.resolveCell(column, row).toLowerCase().includes(searchTerm),
    );
  }

  private formatCellValue(value: string, column: DataTableColumn<T>): string {
    if (column.cellKind === 'fileTypeIcon') {
      return (value ?? '').trim() || '-';
    }

    let formattedValue = value ?? '';

    if (column.formatAsDate) {
      formattedValue = this.formatDateValue(formattedValue);
    }

    if (column.formatAsSentence) {
      formattedValue = formatSentenceValue(formattedValue);
    }

    return formattedValue || '-';
  }

  private formatDateValue(value: string): string {
    const normalized = value?.trim();
    if (!normalized || normalized === '-') {
      return '-';
    }

    const directDateMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
    if (directDateMatch) {
      return directDateMatch[1];
    }

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toISOString().split('T')[0];
  }

  ngAfterViewInit(): void {
    if (!this.enableInfiniteScroll || !this.scrollContainer) {
      return;
    }

    const container = this.scrollContainer.nativeElement;

    this.scrollListener = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (!isNearBottom || this.isLoadingMore || this.isLoadMorePending || !this.hasMore) {
        return;
      }

      this.isLoadMorePending = true;
      this.currentBlockIndex++;

      this.loadMore.emit({
        blockIndex: this.currentBlockIndex,
        offset: this.rows.length,
      });
    };

    container.addEventListener('scroll', this.scrollListener);
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    if (this.scrollListener && this.scrollContainer) {
      this.scrollContainer.nativeElement.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }
  }

  resetScrollInfinite(): void {
    this.currentBlockIndex = 0;
    this.isLoadMorePending = false;
  }
}
