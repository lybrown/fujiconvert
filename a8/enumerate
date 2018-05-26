#!/usr/bin/perl
use strict;
use warnings;

my %media = (
    xegs => {window => '$8000', pages => 32},
    megamax => {window => '$8000', pages => 64},
    atarimax => {window => '$A000', pages => 32},
    megacart => {window => '$8000', pages => 64},
    sic => {window => '$8000', pages => 64},
    thecart => {window => '$A000', pages => 32},
    ram => {window => '$4000', pages => 64},
    emulator => {window => '$4000', pages => 128},
);

sub main {
    for my $media (sort keys %media) {
        my $cart = $media =~ /ram|emulator/ ? 0 : 1;
	for my $method (qw(pcm44 pcm4 pwm covox)) {
	    for my $channels (qw(stereo mono)) {
		for my $period (qw(34 37 48 105 210)) {
		    print "\$$media=1; \$cart=$cart; \$$method=1; \$$channels=1; \$period=$period;";
                    for my $var (sort keys %{$media{$media}}) {
                        my $val = $media{$media}{$var};
                        if ($val =~ /\$/) {
                            print " \$$var='$media{$media}{$var}';";
                        } else {
                            print " \$$var=$media{$media}{$var};";
                        }
                    }
                    print "\n";
		}
	    }
	}
    }
}

main();
