import { Component, OnInit,  ViewChild } from '@angular/core';
import { User, Auth, AuthService } from '@gsrs-core/auth';
import { MatDialog, Sort, MatTableDataSource, PageEvent } from '@angular/material';
import { OverlayContainer } from '@angular/cdk/overlay';
import { UserEditDialogComponent } from '@gsrs-core/admin/user-management/user-edit-dialog/user-edit-dialog.component';
import { AdminService } from '@gsrs-core/admin/admin.service';
import { UtilsService } from '@gsrs-core/utils';
import { DataSource } from '@angular/cdk/table';
import { FormControl } from '@angular/forms';
import {MatPaginator} from '@angular/material/paginator';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  userID: number;
  alert: string;
  filtered = new MatTableDataSource();
  searchControl = new FormControl();
  loading: boolean = false;
  showAll: boolean = false;
  showInactive: boolean = false;
  private overlayContainer: HTMLElement;
  displayedColumns: string[] = ["name", 'email', 'created', 'modified', 'delete'];
  page = 0;
  pageSize = 10;
  paged: Array< any >;
users: Array< any > = [];
private searchTimer: any;
@ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

constructor(
    private dialog: MatDialog,
    private overlayContainerService: OverlayContainer,
    private adminService: AdminService,
    private utilsService: UtilsService,
    private authService: AuthService

  ) { }

  ngOnInit() {
    this.filtered.paginator = this.paginator;
    this.overlayContainer = this.overlayContainerService.getContainerElement();
    this.pageChange();
        this.searchControl.valueChanges.subscribe(value => {
          this.filterList(value, this.filtered.data);
        }, error => {
          console.log(error);
        });
}

showAllUsers(): void {
  this.loading = true;
  this.showAll = true;
  this.adminService.getAllUsers().subscribe(response => {
    this.users = response;
    this.filtered.data = response;
    this.showInactiveUsers();
    this.loading = false;


  });
  this.pageChange();
}

showInactiveUsers(): void {
  this.showInactive = !this.showInactive;
  if (this.showInactive) {
    const backup = [];
    this.users.forEach(user => {
      if (user.active) {
        backup.push(user);
      }
    });
    this.filtered.data = backup;
  } else {
    this.filtered.data = this.users;
  }
  this.pageChange();
}

editUserByName(name: any): void {
  this.loading = true;
  this.alert = "";
  this.adminService.getUserByName(name).subscribe(response => {
    this.loading = false;
    if (response && response.user) {
      const dialogRef = this.dialog.open(UserEditDialogComponent, {
        data: {'user': response},
        width: '800px'
      });
      this.overlayContainer.style.zIndex = '1002';
      const dialogSubscription = dialogRef.afterClosed().subscribe(response => {
        this.overlayContainer.style.zIndex = null;
        if (response && this.showAll === true ) {
          this.updateLocalData(response, null, null, name);
          this.filtered.data.forEach( usr => {
            if (usr['user'] && usr['user'].username === response.user.username){
              usr = response;
            }
          });
        }
      });
    }
    else {
      this.alert = "User Not found";
    }
  }, error=>{
    this.alert = "User Not found";
    this.loading = false;
  });
}

  editUser(userID: any, index: number): void {
    const dialogRef = this.dialog.open(UserEditDialogComponent, {
      data: {'userID': userID},
      width: '800px'
    });
    this.overlayContainer.style.zIndex = '1002';
    const dialogSubscription = dialogRef.afterClosed().subscribe(response => {
      this.overlayContainer.style.zIndex = null;
        if (response ) {
         this.updateLocalData(response, index, userID, null);
         const backup = this.filtered.data;
        backup[index] = response;
        this.filtered.data = backup;
        this.pageChange();
      }
    });
  }

  // change both dataSource and original source to avoid making an API call after every edit
updateLocalData(response: any, index?: number, id?: number, username?: string, ) {
    this.users.forEach( current => {
      if (index){
        if (current.index = response.index) {
          current = response;
        }
      } else {
        if (current.username = response.username) {
          current = response;
        }
      }
    });
    if (index){
      const backup = this.filtered.data;
      backup[index] = response;
      this.filtered.data = backup;
    }
    this.pageChange();
}


  deleteUser(username: string, index: number): void {
    this.adminService.deleteUser(username).subscribe( response => {
      if (response) {
        this.updateLocalData(response, index, null, username);
          const backup = this.filtered.data;
        backup[index] = response;
        this.filtered.data = backup;
      }
    })
  }

  addUser(): void {
    const dialogRef = this.dialog.open(UserEditDialogComponent, {
      data: {'type': 'add'},
      width: '800px'
    });
    this.overlayContainer.style.zIndex = '1002';
    const dialogSubscription = dialogRef.afterClosed().subscribe(response => {
      this.overlayContainer.style.zIndex = null;
      if (response ) {
        const backup = this.filtered.data;
        backup.push(response);
       this.filtered.data = backup;
        this.users.push(response);
      }
    });
  }

  sortData(sort: Sort): void {
    let data = this.users.slice();
    if (this.showInactive) {
      data = [];
    this.users.forEach(user => {
      if (user.active) {
        data.push(user);
      }
    });
    }
    if (!sort.active || sort.direction === '') {
      this.filtered.data = data;
      return;
    }
    this.filtered.data = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'name' : return this.utilsService.compare(a.user.username.toUpperCase(), b.user.username.toUpperCase(), isAsc);
        case 'active' : return this.utilsService.compare(a.active, b.user.active, isAsc);
        case 'email' :return this.utilsService.compare(a.user.email || '', b.user.email || '', isAsc);
        case 'modified' :return this.utilsService.compare(a.modified, b.modified, isAsc);
        case 'created' :return this.utilsService.compare(a.created, b.created, isAsc);
      }
    });
    this.pageChange();
  }

  filterList(searchInput: string, listToFilter: Array<any>): void {
    if (this.searchTimer != null) {
        clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
        this.filtered.data = [];
        listToFilter.forEach(item => {
          const itemString = item.user.username;
            if (itemString.indexOf(searchInput.toUpperCase()) > -1) {
                this.filtered.data.push(item);
            }
        });
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
    }, 700);
  }

  pageChange(pageEvent?: PageEvent): void {
    if (pageEvent != null) {
        this.page = pageEvent.pageIndex;
        this.pageSize = pageEvent.pageSize;
    }
    this.paged = [];
    const startIndex = this.page * this.pageSize;
    for (let i = startIndex; i < (startIndex + this.pageSize); i++) {
        if (this.filtered.data[i] != null) {
            this.paged.push(this.filtered.data[i]);
        } else {
            break;
        }
    }
}

}