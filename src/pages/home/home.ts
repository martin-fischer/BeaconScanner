import {ChangeDetectorRef, Component} from '@angular/core';
import {Platform} from 'ionic-angular';
import {Subscription} from "rxjs/Subscription";
import { InAppBrowser } from '@ionic-native/in-app-browser';

declare var evothings: any;
declare var cordova: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  BLUEBERRY_BEACON = 'a0cee54c0b49';
  MINT_BEACON = '48058592a6c9';
  ICE_BEACON = '63243aedf681';

  beaconData: Map<string, any> = new Map();

  private onResumeSubscription: Subscription;
  private onPauseSubscription: Subscription;

  private scanningInProgress: boolean = false;
  private isInForeground: boolean = true;


  constructor(private platform: Platform, private changeDetector: ChangeDetectorRef, private iab: InAppBrowser) {
    this.onResumeSubscription = platform.resume.subscribe(() => {
      // do something meaningful when the app is put in the foreground
      this.isInForeground = true;
    });

    this.onPauseSubscription = platform.pause.subscribe(() => {
      // do something meaningful when the app is put in the background
      this.isInForeground = false;
    });
  }


  getBeaconList() {
    let beacons = this.beaconData;

    var beaconList = [];
    for (var key in beacons) {
      beaconList.push(beacons[key]);
    }
    return beaconList;
  }

  startScanningForBeacons() {
    this.platform.ready().then(() => {
      this.scanningInProgress = true;
      evothings.eddystone.startScan((data) => {

        if (!this.isInForeground) {

          if (this.beaconData[data.address] && !this.beaconData[data.address].notified) {
            data.notified = true;

            cordova.plugins.notification.local.schedule({
              title: 'Beacon found!',
              text: data.address,
              foreground: true
            });
          }
        }

        data.instanceId = this.uint8ArrayToString(data.bid);
        data.timestamp = Date.now();
        data.distance = evothings.eddystone.calculateAccuracy(data.txPower, data.rssi);
        data.voucherBeacon = this.isVoucherBeacon(data) && this.isInReach(data);
        data.paintingBeacon = this.isPaintingBeacon(data) && this.isInReach(data);
        this.beaconData[data.address] = data;

        this.changeDetector.detectChanges();
      })
    });
  }

  stopScanningForBeacons(): void {
    this.scanningInProgress = false;
    evothings.eddystone.stopScan();
    this.beaconData = new Map();
  }

  isVoucherBeacon(data): boolean {
    return data.instanceId === this.ICE_BEACON;
  }

  isPaintingBeacon(data): boolean {
    return data.instanceId === this.BLUEBERRY_BEACON;
  }

  isInReach(data): boolean {
    return data.distance < 2;
  }

  uint8ArrayToString(uint8Array) {
    function format(x) {
      var hex = x.toString(16);
      return hex.length < 2 ? '0' + hex : hex;
    }

    var result = '';
    for (var i = 0; i < uint8Array.length; ++i) {
      result += format(uint8Array[i]);
    }
    return result.trim();
  }

  showPaintingInfo() {
    const browser = this.iab.create('https://en.wikipedia.org/wiki/Philosopher_in_Meditation');
  }

  ngOnDestroy() {
    // always unsubscribe your subscriptions to prevent leaks
    this.onResumeSubscription.unsubscribe();
    this.onPauseSubscription.unsubscribe();
  }
}
