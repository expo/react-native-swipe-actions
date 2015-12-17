/**
 * Copyright 2015-present 650 Industries. All rights reserved.
 *
 * @providesModule SwipeActions
 */
'use strict';

import React, {
  Animated,
  Easing,
  PanResponder,
  PropTypes,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const START_SWIPE_THRESHOLD = 10.0;
const ACTION_BUTTON_WIDTH = 90;
const ANIMATION_DURATION_MS = 50;
const CLOSE_SWIPE_ACTIONS_EVENT = 'closeSwipeActions';

/**
 * `actions` prop is an array of objects with `text`, `backgroundColor`,
 * and `onPress` fields.
 */
export default class SwipeActions extends React.Component {
  static propTypes = {
    actions: PropTypes.array.isRequired,
    events: PropTypes.object,
  };

  static CLOSE_SWIPE_ACTIONS_EVENT = CLOSE_SWIPE_ACTIONS_EVENT;

  constructor(props, context) {
    super(props, context);

    this._onLayout = this._onLayout.bind(this);
    this._onPanResponderEnd = this._onPanResponderEnd.bind(this);

    this.state = {
      width: 0,
      height: 0,
      isVisible: false,
      isAnimating: false,
      xOffset: new Animated.Value(0),
    };
  }

  componentWillMount() {
    this._panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // TODO: change this to allow the user to stop an animation
        if (this.state.isAnimating) {
          return false;
        }

        return Math.abs(gestureState.dx) > START_SWIPE_THRESHOLD;
      },

      onPanResponderGrant: (e, gestureState) => {
        this.props.events &&
          this.props.events.emit(CLOSE_SWIPE_ACTIONS_EVENT, this);
      },

      onPanResponderMove: (evt, gestureState) => {
        let xOffset = gestureState.dx + (this.state.isVisible ? -this._totalWidth() : 0);
        if (xOffset > 0) {
          xOffset = 0;
        } else if (xOffset < -this._totalWidth()) {
          xOffset = -this._totalWidth();
        }

        this.state.xOffset.setValue(xOffset);
      },

      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: this._onPanResponderEnd,
      onPanResponderRelease: this._onPanResponderEnd,
    });
  }

  componentDidMount() {
    if (this.props.events) {
      this._subscription = this.props.events.addListener(
        CLOSE_SWIPE_ACTIONS_EVENT,
        exemptId => {
          if (this === exemptId || !this.state.isVisible) {
            return;
          }

          this._animate(false);
        },
      );
    }
  }

  componentWillUnmount() {
    this._subscription && this._subscription.remove();
  }

  render() {
    let actionViews = this.state.width === 0 ?
        null : this.props.actions.map((action, index) => {
      return (
        <TouchableOpacity
          key={index}
          onPress={action.onPress}
          style={[styles.actionContainer, {
            right: ACTION_BUTTON_WIDTH * index,
            height: this.state.height,
            backgroundColor: action.backgroundColor,
          }]}>
          <Text style={styles.actionText}>
            {action.text}
          </Text>
        </TouchableOpacity>
      );
    });

    return (
      <View onLayout={this._onLayout} style={styles.container}>
        {actionViews}
        <Animated.View
          {...this._panResponder.panHandlers}
          style={{
            transform: [{translateX: this.state.xOffset}],
            width: this.state.width,
          }}>
          {this.props.children}
        </Animated.View>
      </View>
    );
  }

  _totalWidth() {
    return ACTION_BUTTON_WIDTH * this.props.actions.length;
  }

  _onLayout(event) {
    this.setState({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  }

  _onPanResponderEnd() {
    let threshold = this.state.isVisible ? -this._totalWidth() * 0.75 :
        -this._totalWidth() * 0.25;
    let isVisible = this.state.xOffset.__getValue() < threshold;
    this._animate(isVisible);
  }

  _animate(isVisible) {
    this.setState({
      isAnimating: true,
    });

    // TODO: account for velocity of pan gesture when it ended.
    Animated.timing(this.state.xOffset, {
      toValue: isVisible ? -this._totalWidth() : 0,
      easing: Easing.inOut(Easing.linear),
      duration: ANIMATION_DURATION_MS,
    }).start(result => {
      this.setState({
        isVisible,
        isAnimating: false,
      });
    });
  }
}

let styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  actionContainer: {
    width: ACTION_BUTTON_WIDTH,
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
