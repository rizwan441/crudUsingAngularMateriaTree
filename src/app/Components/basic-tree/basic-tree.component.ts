import {SelectionModel} from '@angular/cdk/collections';
import {FlatTreeControl} from '@angular/cdk/tree';
import {Component, EventEmitter, Injectable, Output} from '@angular/core';
import {MatTreeFlatDataSource, MatTreeFlattener} from '@angular/material/tree';
import {BehaviorSubject} from 'rxjs';
// import { MaterialModule } from '../../material/material.module';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
// import { UpdateTreeComponent } from '../update-tree/update-tree.component';
// import { UpdatedialogComponent } from '../updatedialog/updatedialog.component';
// import { AddDialogComponent } from '../add-dialog/add-dialog.component';
import { CommonModule } from '@angular/common';
import { UpdateDialougeComponent } from '../update-dialouge/update-dialouge.component';


/**
 * Node for to-do item
 */
export class TodoItemNode {
  children?: TodoItemNode[];
  item?: string;
  
}

/** Flat to-do item node with expandable and level information */
export class TodoItemFlatNode {
  item?: string;
  level?: number;
  expandable?: boolean;
}

/**
 * The Json object for to-do list data.
 */
const TREE_DATA = {
  Groceries: {
    'Almond Meal flour': null,
    'Organic eggs': null,
    'Protein Powder': null,
    Fruits: {
      Apple: null,
      Orange: null,
    },
  },
  Reminders: ['Cook dinner', 'Read the Material Design spec', 'Upgrade Application to Angular'],
  Vagetables: {
    'green':['loki', 'cocumber'],
    'red':['Carrot', 'Tomato']
  },
  Dishes: {
    'Biryani':['Spicy', 'simple'],
    'Korma':['Chicken', 'Potato']
  },
   
  
  
};

/**
 * Checklist database, it can build a tree structured Json object.
 * Each node in Json object represents a to-do item or a category.
 * If a node is a category, it has children items and new items can be added under the category.
 */
@Injectable()
export class ChecklistDatabase {
  dataChange = new BehaviorSubject<TodoItemNode[]>([]);

  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }

  constructor() {
    this.initialize();
  }

  initialize() {
    // Build the tree nodes from Json object. The result is a list of TodoItemNode with nested
    //     file node as children.
    const data = this.buildFileTree(TREE_DATA, 0);

    // Notify the change.
    this.dataChange.next(data || []);
  }

  /**
   * Build the file structure tree. The value is the Json object, or a sub-tree of a Json object.
   * The return value is the list of TodoItemNode.
   */
  buildFileTree(obj: {[key: string]: any}, level: number): TodoItemNode[] {
    return Object.keys(obj).reduce<TodoItemNode[]>((accumulator, key) => {
      const value = obj[key];
      const node = new TodoItemNode();
      node.item = key;

      if (value != null) {
        if (typeof value === 'object') {
          node.children = this.buildFileTree(value, level + 1);
        } else {
          node.item = value;
        }
      }

      return accumulator.concat(node);
    }, []);
  }

  /** Add an item to to-do list */
  insertItem(parent: TodoItemNode, name: string) {
    if (parent.children) {
      parent.children.push({item: name} as TodoItemNode);
      this.dataChange.next(this.data);
    }
  }

  updateItem(node: TodoItemNode, name: string) {
    node.item = name;
    this.dataChange.next(this.data);
  }
}

/**
 * @title Tree with checkboxes
 */
// @Component({
  
//   selector: 'app-tree-crud',
//   standalone: true,
//   imports: [MaterialModule,MatCheckboxModule, UpdatedialogComponent, AddDialogComponent, CommonModule],
//   templateUrl: 'tree-crud.component.html',
//   styleUrls: ['tree-crud.component.css'],
//   providers: [ChecklistDatabase, ],
  
// })

@Component({
  selector: 'app-basic-tree',
  templateUrl: './basic-tree.component.html',
  styleUrls: ['./basic-tree.component.css']
})
export class BasicTreeComponent {
  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  updatedname?: string
  parentNodes: TodoItemNode[] = [];
  childNode?: TodoItemNode[] =[]
  fullparentNodes: TodoItemNode[] = [];
  selectedParentNode: TodoItemNode | null = null;
  gettingChild: TodoItemNode[] = [];
  childs: TodoItemNode[] = []
  newChildNode: TodoItemNode | undefined;
  childsarray: string[] | undefined[] = [];

  @Output() update = new EventEmitter<any>()
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>();

  /** A selected parent node to be inserted */
  selectedParent: TodoItemFlatNode | null = null;

  /** The new item's name */
  newItemName = '';

  treeControl: FlatTreeControl<TodoItemFlatNode>;

  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;

  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;

  /** The selection for checklist */
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */);

  constructor(private _database: ChecklistDatabase, private matDialog: MatDialog) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren,
    );
    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

    _database.dataChange.subscribe(data => {
      this.dataSource.data = data;
    });
    this._database.dataChange.subscribe(data => {
      this.parentNodes = data.filter(node =>  node.item);
    });
  }
  // ngOnInit() {
  //   this._database.dataChange.subscribe(data => {
  //     this.parentNodes = this.filterNodesWithChildren(data);
     
  //   });
  // }
  // filterNodesWithChildren(nodes: TodoItemNode[]): TodoItemNode[] {
  //   const result: TodoItemNode[] = [];
  //   for (const node of nodes) {
  //     if (node.children && node.children.length > 0) {
  //       const childrenWithChildren = this.filterNodesWithChildren(node.children);
  //       if (childrenWithChildren.length > 0) {
  //         result.push(node);
  //       }
  //     }
  //   }
  //   console.log(result)
  //   return result;
  // }


  getLevel = (node: TodoItemFlatNode) => node.level ?? 0;

  isExpandable = (node: TodoItemFlatNode) => node.expandable ?? true;

  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children ?? [];

  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.item === '';

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: TodoItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item ? existingNode : new TodoItemFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length; // Set expandable based on whether the node has children
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };
  

  /** Whether all the descendants of the node are selected. */
  descendantsAllSelected(node: TodoItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected =
      descendants.length > 0 &&
      descendants.every(child => {
        return this.checklistSelection.isSelected(child);
      });
    return descAllSelected;
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: TodoItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some(child => this.checklistSelection.isSelected(child));
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the to-do item selection. Select/deselect all the descendants node */
  todoItemSelectionToggle(node: TodoItemFlatNode): void {
    this.checklistSelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.checklistSelection.isSelected(node)
      ? this.checklistSelection.select(...descendants)
      : this.checklistSelection.deselect(...descendants);

    // Force update for the parent
    descendants.forEach(child => this.checklistSelection.isSelected(child));
    this.checkAllParentsSelection(node);
  }

  /** Toggle a leaf to-do item selection. Check all the parents to see if they changed */
  todoLeafItemSelectionToggle(node: TodoItemFlatNode): void {
    this.checklistSelection.toggle(node);
    this.checkAllParentsSelection(node);
  }

  /* Checks all the parents when a leaf node is selected/unselected */
  checkAllParentsSelection(node: TodoItemFlatNode): void {
    let parent: TodoItemFlatNode | null = this.getParentNode(node);
    while (parent) {
      this.checkRootNodeSelection(parent);
      parent = this.getParentNode(parent);
    }
  }

  /** Check root node checked state and change it accordingly */
  checkRootNodeSelection(node: TodoItemFlatNode): void {
    const nodeSelected = this.checklistSelection.isSelected(node);
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected =
      descendants.length > 0 &&
      descendants.every(child => {
        return this.checklistSelection.isSelected(child);
      });
    if (nodeSelected && !descAllSelected) {
      this.checklistSelection.deselect(node);
    } else if (!nodeSelected && descAllSelected) {
      this.checklistSelection.select(node);
    }
  }

  /* Get the parent node of a node */
  getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
    const currentLevel = this.getLevel(node);

    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];

      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  /** Select the category so we can insert the new item. */
  addNewItem(node: TodoItemFlatNode) {
    // const parentNode = this.flatNodeMap.get(node);
    // this._database.insertItem(parentNode!, '');
    // this.treeControl.expand(node);
    const parentNode = this.flatNodeMap.get(node);
  const newItemName = prompt("Enter the name of the new item");
  if (newItemName !== null && newItemName !== "") {
    if (!parentNode?.children) {
      parentNode!.children = [];
      node.expandable = true
      if(node.level){
        node.level +=1
      }
      console.log(this._database.dataChange.next([...this._database.data]));
    }
    const newChildNode = { item: newItemName, children: [] } as TodoItemNode;
    parentNode?.children.push(newChildNode);
    
    this._database.dataChange.next([...this._database.data]);
    console.log("Expanding parent node:", parentNode);
    
    
  }
  }
  
  

  /** Save the node to database */
  saveNode(node: TodoItemFlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node);
    this._database.updateItem(nestedNode!, itemValue);
  }
  deleteItem(node: TodoItemFlatNode): void {
    // Get the nested node corresponding to the flat node
    const nestedNode = this.flatNodeMap.get(node);
  
    // Ensure the node exists
    if (!nestedNode) {
      return;
    }
  
    // Delete the node from the data source
    const parentNode = this.getParentNode(node);
    if (parentNode) {
      const parentNestedNode = this.flatNodeMap.get(parentNode);
      if (parentNestedNode && parentNestedNode.children) {
        parentNestedNode.children = parentNestedNode.children.filter(child => child !== nestedNode);
      }
    } else {
      // If there's no parent node, it means this is a root node
      const data = this.dataSource.data;
      const index = data.indexOf(nestedNode);
      if (index > -1) {
        data.splice(index, 1);
      }
    }
  
    // Notify changes
    this._database.dataChange.next([...this._database.data]);
      
    // Check the parent nodes' selection
    this.checkAllParentsSelection(node);
  }
  getAllDescendants(node: TodoItemNode, excludedNode: TodoItemNode | null): (string | undefined)[] {
    if (!node.children) {
      return [];
    }
    const childrenItems = node.children.map(child => child.item).filter((item): item is string => !!item && node !== excludedNode);
    const descendants = node.children.flatMap(child => this.getAllDescendants(child, excludedNode)).filter((item): item is string => !!item);
    return [...childrenItems, ...descendants];
  }
  openDialog(node: TodoItemFlatNode): void {
    
    // const parentNodesItemValues = this.parentNodes.map(node => node.item && node.children?.map(child=> child.item)).flat()
    // const parentNodesItemValues = this.parentNodes.map(node => node.item && node.children ? node.children.map(child => child.item) : []
    // ).flat();
    const nestedNode = this.flatNodeMap.get(node);
    // if(!nestedNode?.children){
    //   console.log("No child")
    // }
    console.log(nestedNode?.item) 
    const nesteddescendent = nestedNode?.children?.flatMap(child => [
      child.item,
      ...(child?.children?.flatMap(node => [
          node.item,
          ...(node?.children?.map(nodes => nodes.item) || [])
      ]) || [])  // Handle the case where child or node is undefined
  ]) || [];  // Handle the case where nestedNode or nestedNode.children is undefined
  
  
  const parentNodesItemValues = this.parentNodes.map(node => {
// Skip the node if it's the same as nestedNode
    const childrenItems = node.children?.map(child => child.item).filter((item): item is string => !!item);
    const descendants = node.children?.flatMap(child => this.getAllDescendants(child, node)).filter((item): item is string => !!item);
    const filteredDescendants = descendants?.filter(descendant => !nesteddescendent.includes(descendant)); // Filter out descendants from nesteddescendent
    const filteredChildrenItems = childrenItems?.filter(childItem => !nesteddescendent.includes(childItem)); // Filter out children items from nesteddescendent
    return [node.item, ...(filteredChildrenItems || []), ...(filteredDescendants || [])];
}).flat() as string[];

    // const parentNodesItemValues = this.parentNodes.map(node => {
    //   const childrenItems = node.children?.map(child => child.item).filter((item): item is string => !!item);
    //   const descendants = node.children?.flatMap(child => this.getAllDescendants(child, node)).filter((item): item is string => !!item);
    //   const childArray = node === this.newChildNode ? this.childsarray : []; // Include childsarray for the newChildNode
     
    //   return [node.item, ...(childrenItems || []), ...(descendants || []), ...(childArray || [])];
    // }).flat() as string[];
    
    
       
    
    const dialogRef = this.matDialog.open(UpdateDialougeComponent, { data:{node:node, parentNodes: parentNodesItemValues}});
     
    dialogRef.componentInstance.update.subscribe((updatedName: string) => {
      this._database.updateItem(this.flatNodeMap.get(node)!, updatedName);
    });

    dialogRef.componentInstance.updateNode.subscribe((data: any)=>{
   
      const parentNodeItem = data.parentNode;
      const childNodeItem = data.childNode;
      
      
      
      // Find the parent node in the tree data structure
      const parentNode = this.findNodeByItem(this.dataSource.data, parentNodeItem);
      const existingChildNode = this.findNodeByItem(this.dataSource.data, childNodeItem);

     
     
     
  
      // Ensure that both parent and child nodes are found
      if (parentNode && existingChildNode) {
        this.deleteChildNodeInTree(existingChildNode);
        // Create a new child node
        this.newChildNode = { item: childNodeItem, children: existingChildNode.children } as TodoItemNode;
        
        this.childsarray = this.newChildNode?.children?.flatMap(child => [
          child.item,
          ...(child.children?.map(node => node.item) || [])
      ]).filter(item => item !== undefined) as string[];
          console.log(this.childsarray)
        
  
        // Add the new child node to the parent node
        parentNode.children = parentNode.children || [];
        parentNode.children.push(this.newChildNode);
        console.log(parentNodesItemValues)
  
        // Notify changes in the data source
        this._database.dataChange.next([...this._database.data]);
  
        // Optionally, you can expand the parent node in the tree
        const flatParentNode = this.nestedNodeMap.get(parentNode);
        if (flatParentNode) {
          this.treeControl.expand(flatParentNode);
        }
      } else {
        console.log("Parent node or child node not found.");
      }
    });
  }

  findNodeByItem(nodes: TodoItemNode[], item: string): TodoItemNode | undefined {
    for (const node of nodes) {
      if (node.item === item) {
        return node;
      }
      if (node.children) {
        const foundNode = this.findNodeByItem(node.children, item);
        if (foundNode) {
          return foundNode;
        }
      }
    }
    return undefined;
  }
  deleteChildNodeInTree(childNode: TodoItemNode): void {
    // Find the parent node of the child node
    const parentNode = this.findParentNodeInTree(this.dataSource.data, childNode);

    // Ensure that the parent node is found
    if (parentNode) {
        // Delete the child node from the parent's children array
        parentNode.children = parentNode.children?.filter(child => child !== childNode);

        // Notify changes in the data source
        this._database.dataChange.next([...this._database.data]);
    }
    // else{
    //   childNode.children = childNode.children?.filter(child=>child !== childNode)
    //   this._database.dataChange.next([...this._database.data]);
    // }
}

findParentNodeInTree(nodes: TodoItemNode[], childNode: TodoItemNode): TodoItemNode | undefined {
    for (const node of nodes) {
        if (node.children && node.children.includes(childNode)) {
            return node;
        } else if (node.children) {
            const parentNode = this.findParentNodeInTree(node.children, childNode);
            if (parentNode) {
                return parentNode;
            }
        }
    }
    return undefined;
}


}
