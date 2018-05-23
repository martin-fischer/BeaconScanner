import {Component} from '@angular/core';
import {InAppBrowser} from '@ionic-native/in-app-browser';
import {NativeAudio} from "@ionic-native/native-audio";
import {Platform} from 'ionic-angular';
import {Subscription} from "rxjs/Subscription";

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

  scanningInProgress: boolean = false;
  isInForeground: boolean = true;
  playingInProgress: boolean = false;


  constructor(private platform: Platform, private iab: InAppBrowser, private nativeAudio: NativeAudio) {
    this.onResumeSubscription = platform.resume.subscribe(() => {
      // do something meaningful when the app is put in the foreground
      this.isInForeground = true;
    });

    this.onPauseSubscription = platform.pause.subscribe(() => {
      // do something meaningful when the app is put in the background
      this.isInForeground = false;
    });
  }

  ionViewWillEnter():void {
    this.startScanningForBeacons();
    // Timer that refreshes the beacon list.
     setInterval(this.getBeaconList, 2000);
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

        // this.changeDetector.detectChanges();
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

  showPaintingInfo(): void {
    this.iab.create('https://en.wikipedia.org/wiki/Philosopher_in_Meditation');
  }

  playPaintingInfo(): void {
    this.nativeAudio.preloadComplex('rembrandt', 'assets/sounds/Rembrandt_Selbstbildnis_als_der_verlorene_ Sohn_im_Wirtshaus.mp3', 1, 1, 0).then(() => {
      this.nativeAudio.play('rembrandt').then(() => {
        this.playingInProgress = true;
      }, (error) => {
        this.playingInProgress = false;
      });
    }, (error) => {
      this.playingInProgress = false;
    });
  }

  stopPaintingInfo() {
    this.nativeAudio.stop('rembrandt').then(() => {}, () => {});
  }

  ngOnDestroy() {
    // always unsubscribe your subscriptions to prevent leaks
    this.onResumeSubscription.unsubscribe();
    this.onPauseSubscription.unsubscribe();
  }
}
