//
//  OCSSRule.h
//  Pods
//
//  Created by Zak.
//
//

#import "OCSSToken.h"

@interface OCSSRule : OCSSToken

@property (strong) NSAttributedString *selector;
@property (strong) NSMutableArray *blockContent;

+ (OCSSRule *)ruleWithSelector:(NSString *)selector andBlockContent:(NSArray *)blockContent;

@end
